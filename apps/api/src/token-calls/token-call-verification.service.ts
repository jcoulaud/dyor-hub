import { TokenCallStatus } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class TokenCallVerificationService {
  private readonly logger = new Logger(TokenCallVerificationService.name);
  private isJobRunning = false;

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly tokensService: TokensService,
  ) {}

  // Run verification job
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting Token Call Verification Job...');

    if (this.isJobRunning) {
      this.logger.warn(
        'Verification job is already running. Skipping this run.',
      );
      return;
    }

    this.isJobRunning = true;
    try {
      await this.verifyPendingCalls();
    } catch (error) {
      this.logger.error('Error during token call verification job:', error);
    } finally {
      this.isJobRunning = false;
      this.logger.log('Token Call Verification Job finished.');
    }
  }

  async verifyPendingCalls(): Promise<void> {
    const now = new Date();
    const pendingCalls = await this.tokenCallRepository.find({
      where: {
        status: TokenCallStatus.PENDING,
        targetDate: LessThanOrEqual(now), // Find calls where target date has passed
      },
    });

    if (pendingCalls.length === 0) {
      this.logger.log('No pending token calls found for verification.');
      return;
    }

    this.logger.log(
      `Found ${pendingCalls.length} pending token calls to verify.`,
    );

    for (const call of pendingCalls) {
      try {
        await this.verifySingleCall(call);
      } catch (error) {
        this.logger.error(`Failed to verify call ${call.id}:`, error);
        call.status = TokenCallStatus.ERROR;
        call.verificationTimestamp = new Date();
        await this.tokenCallRepository.save(call).catch((saveError) => {
          this.logger.error(
            `Failed to save ERROR status for call ${call.id}:`,
            saveError,
          );
        });
      }
      // Add delay to avoid hitting Birdeye rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async verifySingleCall(call: TokenCallEntity): Promise<void> {
    this.logger.log(`Verifying call ${call.id} for token ${call.tokenId}...`);
    let priceHistory: { items: Array<{ unixTime: number; value: number }> };

    // 1. Fetch Price History
    try {
      priceHistory = await this.tokensService.getTokenPriceHistory(
        call.tokenId,
        call.callTimestamp,
        call.targetDate,
        '1H',
      );
    } catch (error) {
      if (error.message?.includes('Rate limit exceeded')) {
        this.logger.warn(
          `Rate limit hit while fetching price history for call ${call.id} (Token: ${call.tokenId}). Consider adding delays.`,
        );
        throw new Error(`Rate limit hit: ${error.message}`);
      } else if (
        error.message?.includes('Failed to fetch price data from Birdeye')
      ) {
        this.logger.error(
          `Birdeye API error for call ${call.id} (Token: ${call.tokenId}): ${error.message}`,
        );
        throw new Error(`Birdeye API error: ${error.message}`);
      } else {
        this.logger.error(
          `Unknown error fetching price history for call ${call.id} (Token: ${call.tokenId})`,
          error,
        );
        throw new Error(`Unknown price history error: ${error.message}`);
      }
    }

    if (!priceHistory || priceHistory.items.length === 0) {
      this.logger.warn(
        `No price history found for call ${call.id} (Token: ${call.tokenId}). Skipping verification.`,
      );
      call.verificationTimestamp = new Date();
      await this.tokenCallRepository.save(call);
      return;
    }

    // 2. Analyze Price History
    let peakPriceDuringPeriod = 0;
    const finalPriceAtTargetDate =
      priceHistory.items[priceHistory.items.length - 1]?.value ?? null;
    let targetHitTimestamp: Date | null = null;
    const targetPriceNum = call.targetPrice;

    for (const pricePoint of priceHistory.items) {
      if (pricePoint.value > peakPriceDuringPeriod) {
        peakPriceDuringPeriod = pricePoint.value;
      }
      if (pricePoint.value >= targetPriceNum && targetHitTimestamp === null) {
        targetHitTimestamp = new Date(pricePoint.unixTime * 1000);
      }
    }

    // 3. Determine Outcome and Update Call Entity
    call.peakPriceDuringPeriod = peakPriceDuringPeriod;
    call.finalPriceAtTargetDate = finalPriceAtTargetDate;
    call.verificationTimestamp = new Date();

    if (
      peakPriceDuringPeriod >= targetPriceNum &&
      targetHitTimestamp !== null
    ) {
      call.status = TokenCallStatus.VERIFIED_SUCCESS;
      call.targetHitTimestamp = targetHitTimestamp;

      // Calculate timeToHitRatio
      const callDurationMs =
        call.targetDate.getTime() - call.callTimestamp.getTime();
      const timeToHitMs =
        targetHitTimestamp.getTime() - call.callTimestamp.getTime();

      if (callDurationMs > 0) {
        call.timeToHitRatio = Math.max(0, timeToHitMs) / callDurationMs;
      } else {
        call.timeToHitRatio = timeToHitMs > 0 ? 1 : 0; // Edge case: immediate hit or zero duration
      }
      this.logger.log(`Call ${call.id} verified: SUCCESS`);
    } else {
      call.status = TokenCallStatus.VERIFIED_FAIL;
      call.targetHitTimestamp = null;
      call.timeToHitRatio = null;
      this.logger.log(`Call ${call.id} verified: FAIL`);
    }

    // 4. Save Updated Call
    await this.tokenCallRepository.save(call);
    this.logger.debug(`Saved verification results for call ${call.id}`);
  }
}
