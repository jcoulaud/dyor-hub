import { TokenCallStatus } from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { add, Duration } from 'date-fns';
import { In, Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensService } from '../tokens/tokens.service';
import { UserTokenCallStatsDto } from '../users/dto/user-token-call-stats.dto';
import { CreateTokenCallDto } from './dto/create-token-call.dto';

export interface PaginatedTokenCallsResult {
  items: TokenCallEntity[];
  total: number;
  page: number;
  limit: number;
}

interface TokenCallFilters {
  userId?: string;
  tokenId?: string;
  status?: TokenCallStatus;
}

@Injectable()
export class TokenCallsService {
  private readonly logger = new Logger(TokenCallsService.name);

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly tokensService: TokensService,
  ) {}

  /**
   * Parses timeframe string (e.g., "3m", "1y") and returns a Duration object for date-fns.
   * @param timeframeDuration e.g., "1d", "3w", "6m", "1y"
   * @returns Duration object like { days: 1 }, { weeks: 3 }, { months: 6 }, { years: 1 }
   */
  private parseTimeframe(timeframeDuration: string): Duration {
    const match = timeframeDuration.match(/^(\d+)(d|w|m|y)$/);
    if (!match) {
      throw new Error(`Invalid timeframe format: ${timeframeDuration}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return { days: value };
      case 'w':
        return { weeks: value };
      case 'm':
        return { months: value };
      case 'y':
        return { years: value };
      default:
        throw new Error(`Unsupported timeframe unit: ${unit}`);
    }
  }

  async create(
    createTokenCallDto: CreateTokenCallDto,
    userId: string,
  ): Promise<TokenCallEntity> {
    const { tokenId, targetPrice, timeframeDuration } = createTokenCallDto;
    this.logger.log(
      `Attempting to create token call for token ${tokenId} by user ${userId}`,
    );

    // 1. Validate token exists and fetch its data (increases view count)
    try {
      await this.tokensService.getTokenData(tokenId, userId);
    } catch (error) {
      this.logger.warn(
        `Token validation failed for ${tokenId}: ${error.message}`,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Could not validate token.');
    }

    // 2. Fetch the current price using the now public fetchDexScreenerData
    let referencePrice: number;
    try {
      const dexData = await this.tokensService.fetchDexScreenerData(tokenId);
      if (!dexData || typeof dexData.price !== 'number') {
        throw new NotFoundException(
          `Current price not found via DexScreener for token ID: ${tokenId}`,
        );
      }
      referencePrice = dexData.price;
      this.logger.debug(
        `Reference price for token ${tokenId}: ${referencePrice}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch DexScreener price for ${tokenId}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Could not fetch current token price.',
      );
    }

    // 3. Calculate Target Date
    const callTimestamp = new Date();
    let targetDate: Date;
    try {
      const duration = this.parseTimeframe(timeframeDuration);
      targetDate = add(callTimestamp, duration);
      this.logger.debug(
        `Calculated target date for duration ${timeframeDuration}: ${targetDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to parse timeframe or calculate target date: ${timeframeDuration}`,
        error.stack,
      );
      throw new InternalServerErrorException('Invalid timeframe duration.');
    }

    // 4. Create and Save the TokenCallEntity
    try {
      const newCall = this.tokenCallRepository.create({
        userId,
        tokenId,
        callTimestamp,
        referencePrice,
        targetPrice,
        timeframeDuration,
        targetDate,
        status: TokenCallStatus.PENDING,
      });

      const savedCall = await this.tokenCallRepository.save(newCall);
      this.logger.log(
        `Successfully created token call ${savedCall.id} for token ${tokenId} by user ${userId}`,
      );
      return savedCall;
    } catch (error) {
      this.logger.error(
        `Failed to save token call for token ${tokenId} by user ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not save token call.');
    }
  }

  async findPendingCallsPastTargetDate(date: Date): Promise<TokenCallEntity[]> {
    return this.tokenCallRepository
      .createQueryBuilder('call')
      .where('call.status = :status', { status: TokenCallStatus.PENDING })
      .andWhere('call.targetDate <= :date', { date })
      .getMany();
  }

  /**
   * Finds all public token calls
   */
  async findAllPublic(
    pagination: { page: number; limit: number },
    filters: TokenCallFilters = {},
  ): Promise<PaginatedTokenCallsResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    this.logger.log(
      `Fetching public token calls, filters: ${JSON.stringify(filters)}, page: ${page}, limit: ${limit}`,
    );

    const whereClause: Partial<TokenCallEntity> = {};
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.tokenId) {
      whereClause.tokenId = filters.tokenId;
    }

    try {
      const [items, total] = await this.tokenCallRepository.findAndCount({
        where: whereClause,
        relations: {
          token: true,
          user: true,
        },
        select: {
          id: true,
          userId: true,
          tokenId: true,
          callTimestamp: true,
          referencePrice: true,
          targetPrice: true,
          timeframeDuration: true,
          targetDate: true,
          status: true,
          verificationTimestamp: true,
          peakPriceDuringPeriod: true,
          finalPriceAtTargetDate: true,
          targetHitTimestamp: true,
          timeToHitRatio: true,
          createdAt: true,
          updatedAt: true,
          token: {
            mintAddress: true,
            name: true,
            symbol: true,
            imageUrl: true,
          },
          user: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        order: { createdAt: 'DESC' },
        skip: skip,
        take: limit,
      });

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error(
        `Failed to fetch public token calls with filters: ${JSON.stringify(filters)}`,
        error,
      );
      throw new InternalServerErrorException('Could not fetch token calls.');
    }
  }

  /**
   * Finds a single token call by its ID.
   */
  async findOneById(callId: string): Promise<TokenCallEntity> {
    try {
      const call = await this.tokenCallRepository.findOne({
        where: { id: callId },
        relations: {
          token: true,
          user: true,
        },
        select: {
          token: {
            mintAddress: true,
            name: true,
            symbol: true,
            imageUrl: true,
          },
          user: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      });

      if (!call) {
        throw new NotFoundException(`Token call with ID ${callId} not found.`);
      }
      return call;
    } catch (error) {
      this.logger.error(`Failed to fetch token call ${callId}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Could not fetch token call details.',
      );
    }
  }

  /**
   * Calculates performance statistics for a user's token calls.
   */
  async calculateUserStats(userId: string): Promise<UserTokenCallStatsDto> {
    this.logger.log(`Calculating token call stats for user ${userId}`);

    try {
      // Fetch all VERIFIED calls for the user
      const verifiedCalls = await this.tokenCallRepository.find({
        where: {
          userId: userId,
          status: In([
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ]),
        },
        select: [
          'status',
          'referencePrice',
          'targetPrice',
          'timeToHitRatio',
          'id',
        ],
      });

      const totalCalls = verifiedCalls.length;
      if (totalCalls === 0) {
        return {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          accuracyRate: 0,
          averageGainPercent: null,
          averageTimeToHitRatio: null,
        };
      }

      const successfulCalls = verifiedCalls.filter(
        (call) => call.status === TokenCallStatus.VERIFIED_SUCCESS,
      );
      const failedCalls = totalCalls - successfulCalls.length;
      const accuracyRate = successfulCalls.length / totalCalls;

      let totalGainPercent = 0;
      let totalTimeToHitRatio = 0;
      let successfulCallsWithValidData = 0;

      for (const call of successfulCalls) {
        // Calculate gain percent for successful calls
        const refPrice = call.referencePrice;
        const targetPrice = call.targetPrice;
        let gainPercent = 0;
        if (refPrice > 0) {
          gainPercent = ((targetPrice - refPrice) / refPrice) * 100;
        }

        // Accumulate only if data is valid
        if (call.timeToHitRatio !== null && isFinite(gainPercent)) {
          totalGainPercent += gainPercent;
          totalTimeToHitRatio += call.timeToHitRatio;
          successfulCallsWithValidData++;
        } else {
          this.logger.warn(
            `Call ${call.id} excluded from average calculation due to null/invalid data (ratio: ${call.timeToHitRatio}, gain: ${gainPercent})`,
          );
        }
      }

      const averageGainPercent =
        successfulCallsWithValidData > 0
          ? totalGainPercent / successfulCallsWithValidData
          : null;
      const averageTimeToHitRatio =
        successfulCallsWithValidData > 0
          ? totalTimeToHitRatio / successfulCallsWithValidData
          : null;

      return {
        totalCalls,
        successfulCalls: successfulCalls.length,
        failedCalls,
        accuracyRate,
        averageGainPercent,
        averageTimeToHitRatio,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate token call stats for user ${userId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not calculate user statistics.',
      );
    }
  }
}
