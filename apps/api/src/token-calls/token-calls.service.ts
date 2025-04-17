import { PaginatedTokenCallsResult, TokenCallStatus } from '@dyor-hub/types';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { add, Duration } from 'date-fns';
import { In, Not, Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokenEntity } from '../entities/token.entity';
import { TokensService } from '../tokens/tokens.service';
import { UserTokenCallStatsDto } from '../users/dto/user-token-call-stats.dto';
import { CreateTokenCallDto } from './dto/create-token-call.dto';

export interface TokenCallFilters {
  username?: string;
  userId?: string;
  tokenId?: string;
  tokenSearch?: string;
  status?: TokenCallStatus[];
  callStartDate?: string;
  callEndDate?: string;
  targetStartDate?: string;
  targetEndDate?: string;
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
   * Parses timeframe string (e.g., "3M", "1y") and returns a Duration object for date-fns.
   * @param timeframeDuration e.g., "15m", "1h", "1d", "3w", "6M", "1y"
   * @returns Duration object like { minutes: 15 }, { hours: 1 }, { days: 1 }, { weeks: 3 }, { months: 6 }, { years: 1 }
   */
  private parseTimeframe(timeframeDuration: string): Duration {
    const match = timeframeDuration.match(/^(\d+)(m|h|d|w|M|y)$/);
    if (!match) {
      // Add logging for better debugging
      this.logger.error(
        `Invalid timeframe format received: ${timeframeDuration}`,
      );
      throw new Error(`Invalid timeframe format: ${timeframeDuration}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return { minutes: value };
      case 'h':
        return { hours: value };
      case 'd':
        return { days: value };
      case 'w':
        return { weeks: value };
      case 'M':
        return { months: value };
      case 'y':
        return { years: value };
      default:
        this.logger.error(
          `Unsupported timeframe unit encountered after regex match: ${unit}`,
        );
        throw new Error(`Unsupported timeframe unit: ${unit}`);
    }
  }

  async create(
    createTokenCallDto: CreateTokenCallDto,
    userId: string,
  ): Promise<TokenCallEntity> {
    const { tokenId, targetPrice, timeframeDuration } = createTokenCallDto;

    // 1. Validate token exists
    let tokenInfo: TokenEntity | null = null;
    try {
      tokenInfo = await this.tokensService.getTokenData(tokenId, userId);
    } catch (error) {
      this.logger.warn(
        `Token validation failed during call creation for ${tokenId}: ${error.message}`,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Could not validate token ${tokenId}.`,
      );
    }

    // 2. Fetch the CURRENT price and supply
    let referencePrice: number | null = null;
    let referenceSupply: number | null = null;
    try {
      const overviewData = await this.tokensService.fetchTokenOverview(tokenId);

      if (
        overviewData &&
        typeof overviewData.price === 'number' &&
        overviewData.price > 0
      ) {
        referencePrice = overviewData.price;
        referenceSupply =
          overviewData.circulatingSupply ?? overviewData.totalSupply ?? null;
        if (typeof referenceSupply !== 'number' || referenceSupply <= 0) {
          this.logger.warn(
            `Invalid or missing reference supply for ${tokenId}, setting to null.`,
          );
          referenceSupply = null;
        }
      } else {
        throw new Error(
          'Fetched overview data or price is invalid or missing.',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch token overview for ${tokenId} during creation: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Could not fetch accurate price and supply for ${tokenId} at the time of submission.`,
      );
    }

    // 3. Basic Validation: Target price vs fetched current price
    if (targetPrice <= referencePrice) {
      throw new BadRequestException(
        `Target price ($${targetPrice}) must be higher than the reference price ($${referencePrice}) at the time of submission.`,
      );
    }

    // 4. Calculate Target Date
    const callTimestamp = new Date();
    let targetDate: Date;
    try {
      const duration = this.parseTimeframe(timeframeDuration);
      targetDate = add(callTimestamp, duration);
    } catch (error) {
      this.logger.error(
        `Failed to parse timeframe or calculate target date: ${timeframeDuration}`,
        error.stack,
      );
      throw new InternalServerErrorException('Invalid timeframe duration.');
    }

    // 5. Create and Save the TokenCallEntity
    try {
      const newCall = this.tokenCallRepository.create({
        userId,
        tokenId,
        callTimestamp,
        referencePrice: referencePrice,
        referenceSupply: referenceSupply,
        targetPrice,
        timeframeDuration,
        targetDate,
        status: TokenCallStatus.PENDING,
      });

      const savedCall = await this.tokenCallRepository.save(newCall);

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
   * Finds all public token calls with filtering and sorting
   */
  async findAllPublic(
    pagination: { page: number; limit: number },
    filters: TokenCallFilters = {},
    sort: { sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {},
  ): Promise<PaginatedTokenCallsResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const { sortBy = 'createdAt', sortOrder = 'DESC' } = sort;

    const queryBuilder = this.tokenCallRepository
      .createQueryBuilder('call')
      .leftJoin('call.user', 'user')
      .addSelect([
        'user.id',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
      ])
      .leftJoin('call.token', 'token')
      .addSelect([
        'token.mintAddress',
        'token.name',
        'token.symbol',
        'token.imageUrl',
      ])
      .skip(skip)
      .take(limit);

    const parameters: { [key: string]: any } = {};
    let whereConditions: string[] = [];

    if (filters.username) {
      whereConditions.push('user.username ILIKE :username');
      parameters.username = `%${filters.username}%`;
    }
    if (filters.userId) {
      whereConditions.push('call.userId = :userId');
      parameters.userId = filters.userId;
    }
    if (filters.tokenId) {
      whereConditions.push('call.tokenId = :tokenId');
      parameters.tokenId = filters.tokenId;
    }
    if (filters.tokenSearch) {
      whereConditions.push(
        '(token.mintAddress ILIKE :tokenSearch OR token.symbol ILIKE :tokenSearch OR token.name ILIKE :tokenSearch)',
      );
      parameters.tokenSearch = `%${filters.tokenSearch}%`;
    }
    if (filters.status && filters.status.length > 0) {
      const validStatuses = filters.status.filter((s) =>
        Object.values(TokenCallStatus).includes(s),
      );
      if (validStatuses.length > 0) {
        whereConditions.push('call.status IN (:...statuses)');
        parameters.statuses = validStatuses;
      }
    } else {
      // Exclude tokens with ERROR status if no status filter is explicitly provided
      whereConditions.push('call.status != :excludedStatus');
      parameters.excludedStatus = TokenCallStatus.ERROR;
    }
    if (filters.callStartDate && filters.callEndDate) {
      try {
        const start = new Date(filters.callStartDate);
        const end = new Date(filters.callEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error();
        whereConditions.push(
          'call.callTimestamp BETWEEN :callStart AND :callEnd',
        );
        parameters.callStart = start;
        parameters.callEnd = end;
      } catch (e) {
        throw new BadRequestException('Invalid call start/end date format.');
      }
    }
    if (filters.targetStartDate && filters.targetEndDate) {
      try {
        const start = new Date(filters.targetStartDate);
        const end = new Date(filters.targetEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error();
        whereConditions.push(
          'call.targetDate BETWEEN :targetStart AND :targetEnd',
        );
        parameters.targetStart = start;
        parameters.targetEnd = end;
      } catch (e) {
        throw new BadRequestException('Invalid target start/end date format.');
      }
    }

    if (whereConditions.length > 0) {
      queryBuilder.where(whereConditions.join(' AND '), parameters);
    }

    if (sortBy === 'multiplier') {
      queryBuilder.addSelect(
        '(CASE WHEN call.referencePrice <> 0 THEN call.targetPrice / call.referencePrice ELSE NULL END)',
        'call_multiplier',
      );
      queryBuilder.orderBy(
        'call_multiplier',
        sortOrder,
        sortOrder === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST',
      );
    } else {
      const orderField = `call.${sortBy}`;
      const metadata = this.tokenCallRepository.metadata;
      if (metadata.hasColumnWithPropertyPath(sortBy)) {
        queryBuilder.orderBy(orderField, sortOrder);
      } else {
        this.logger.warn(
          `Invalid sort field provided: ${sortBy}. Defaulting to createdAt.`,
        );
        queryBuilder.orderBy('call.createdAt', 'DESC');
      }
    }
    if (sortBy !== 'createdAt') {
      queryBuilder.addOrderBy('call.createdAt', 'DESC');
    }

    try {
      const [calls, total] = await queryBuilder.getManyAndCount();

      const items = calls.map((call) => ({
        ...call,
        referenceSupply: call.referenceSupply,
        callTimestamp: call.callTimestamp.toISOString(),
        targetDate: call.targetDate.toISOString(),
        verificationTimestamp:
          call.verificationTimestamp?.toISOString() || null,
        targetHitTimestamp: call.targetHitTimestamp?.toISOString() || null,
        createdAt: call.createdAt.toISOString(),
        updatedAt: call.updatedAt.toISOString(),
        user: call.user
          ? {
              id: call.user.id,
              username: call.user.username,
              displayName: call.user.displayName,
              avatarUrl: call.user.avatarUrl,
            }
          : undefined,
        token: call.token
          ? {
              mintAddress: call.token.mintAddress,
              name: call.token.name,
              symbol: call.token.symbol,
              imageUrl: call.token.imageUrl,
            }
          : undefined,
      }));

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error(
        `Failed to fetch public token calls with filters: ${JSON.stringify(filters)}`,
        error.stack,
      );
      if (error.query && error.parameters) {
        throw new BadRequestException(`Query error: ${error.message}`);
      }
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
          id: true,
          userId: true,
          tokenId: true,
          callTimestamp: true,
          referencePrice: true,
          referenceSupply: true,
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
          priceHistoryUrl: true,
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
      // First, get the total count of ALL calls (including pending ones)
      const allCalls = await this.tokenCallRepository.count({
        where: {
          userId: userId,
          status: Not(TokenCallStatus.ERROR), // Exclude ERROR status
        },
      });

      // Fetch all VERIFIED calls for the user (for calculating success metrics)
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
          'peakPriceDuringPeriod',
          'id',
          'referenceSupply',
        ],
      });

      const successfulCalls = verifiedCalls.filter(
        (call) => call.status === TokenCallStatus.VERIFIED_SUCCESS,
      );
      const verifiedCallsCount = verifiedCalls.length;
      const failedCalls = verifiedCallsCount - successfulCalls.length;
      const accuracyRate =
        verifiedCallsCount > 0
          ? successfulCalls.length / verifiedCallsCount
          : 0;

      let totalGainPercent = 0;
      let totalTimeToHitRatio = 0;
      let totalMultiplier = 0;
      let successfulCallsWithValidData = 0;
      let totalMarketCapAtCallTime = 0;
      let callsWithMarketCapAtCallTime = 0;

      // Calculate average market cap at call time over ALL verified calls
      for (const call of verifiedCalls) {
        if (
          call.referencePrice > 0 &&
          call.referenceSupply &&
          call.referenceSupply > 0
        ) {
          totalMarketCapAtCallTime +=
            call.referencePrice * call.referenceSupply;
          callsWithMarketCapAtCallTime++;
        }
      }

      // Calculate averages for successful calls
      for (const call of successfulCalls) {
        const refPrice = call.referencePrice;
        const targetPrice = call.targetPrice;
        const peakPrice = call.peakPriceDuringPeriod;
        let gainPercent = 0;
        let multiplier = 0;

        if (refPrice > 0) {
          gainPercent = ((targetPrice - refPrice) / refPrice) * 100;
          multiplier = peakPrice / refPrice;
        }

        // Accumulate only if data is valid
        if (
          call.timeToHitRatio !== null &&
          isFinite(gainPercent) &&
          isFinite(multiplier)
        ) {
          totalGainPercent += gainPercent;
          totalTimeToHitRatio += call.timeToHitRatio;
          totalMultiplier += multiplier;
          successfulCallsWithValidData++;
        } else {
          this.logger.warn(
            `Call ${call.id} excluded from average calculation due to null/invalid data (ratio: ${call.timeToHitRatio}, gain: ${gainPercent}, multiplier: ${multiplier})`,
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
      const averageMultiplier =
        successfulCallsWithValidData > 0
          ? totalMultiplier / successfulCallsWithValidData
          : null;

      // Calculate average MCAP at call time
      const averageMarketCapAtCallTime =
        callsWithMarketCapAtCallTime > 0
          ? totalMarketCapAtCallTime / callsWithMarketCapAtCallTime
          : null;

      return {
        totalCalls: allCalls,
        successfulCalls: successfulCalls.length,
        failedCalls,
        accuracyRate,
        averageGainPercent,
        averageTimeToHitRatio,
        averageMultiplier,
        averageMarketCapAtCallTime,
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
