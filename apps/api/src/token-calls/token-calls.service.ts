import { TokenCallStatus } from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { add, Duration } from 'date-fns';
import { Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensService } from '../tokens/tokens.service';
import { CreateTokenCallDto } from './dto/create-token-call.dto';

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
}
