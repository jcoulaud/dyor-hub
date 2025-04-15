import { NotificationType, TokenCallStatus } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserTokenCallStreakEntity } from '../entities/user-token-call-streak.entity';
import { BadgeService } from '../gamification/services/badge.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class TokenCallVerificationService {
  private readonly logger = new Logger(TokenCallVerificationService.name);
  private isJobRunning = false;

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    @InjectRepository(UserTokenCallStreakEntity)
    private readonly tokenCallStreakRepository: Repository<UserTokenCallStreakEntity>,
    private readonly tokensService: TokensService,
    private readonly badgeService: BadgeService,
    private readonly notificationService: NotificationsService,
  ) {}

  // Run verification job
  @Cron(CronExpression.EVERY_5_MINUTES)
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

    // Determine Adaptive Resolution
    const durationMs = call.targetDate.getTime() - call.callTimestamp.getTime();
    let resolution: '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '1D';

    // Define thresholds
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const SIX_HOURS_MS = 6 * ONE_HOUR_MS;
    const ONE_DAY_MS = 24 * ONE_HOUR_MS;
    const THREE_DAYS_MS = 3 * ONE_DAY_MS;
    const ONE_WEEK_MS = 7 * ONE_DAY_MS;
    const ONE_MONTH_MS = 30 * ONE_DAY_MS;

    if (durationMs <= ONE_HOUR_MS) {
      resolution = '1m'; // Use 1-minute data for calls <= 1 hour
    } else if (durationMs <= SIX_HOURS_MS) {
      resolution = '5m'; // Use 5-minute data for calls <= 6 hours
    } else if (durationMs <= ONE_DAY_MS) {
      resolution = '15m'; // Use 15-minute data for calls <= 1 day
    } else if (durationMs <= THREE_DAYS_MS) {
      resolution = '30m'; // Use 30-minute data for calls <= 3 days
    } else if (durationMs <= ONE_WEEK_MS) {
      resolution = '1H'; // Use 1-hour data for calls <= 1 week
    } else if (durationMs <= ONE_MONTH_MS) {
      resolution = '2H'; // Use 2-hour data for calls <= 1 month (approx)
    } else {
      resolution = '1D'; // Use daily data for calls > 1 month
    }

    // 1. Fetch Price History
    try {
      priceHistory = await this.tokensService.getTokenPriceHistory(
        call.tokenId,
        call.callTimestamp,
        call.targetDate,
        resolution,
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
    } else {
      call.status = TokenCallStatus.VERIFIED_FAIL;
      call.targetHitTimestamp = null;
      call.timeToHitRatio = null;
    }

    // 4. Update Streak Information
    try {
      await this.updateUserTokenCallStreak(
        call.userId,
        call.status,
        call.verificationTimestamp,
      );
    } catch (streakError) {
      this.logger.error(
        `Failed to update token call streak for user ${call.userId} after call ${call.id}:`,
        streakError,
      );
    }

    // 5. Save Updated Call
    await this.tokenCallRepository.save(call);
    this.logger.debug(`Saved verification results for call ${call.id}`);

    // 6. Send Notification using generic service
    try {
      const token = await this.tokensService.getTokenData(call.tokenId);

      const notificationType = NotificationType.TOKEN_CALL_VERIFIED;
      const status =
        call.status === TokenCallStatus.VERIFIED_SUCCESS ? 'success' : 'fail';
      let message = '';

      const tokenDisplay = token?.symbol || call.tokenId;
      const targetPriceFormatted = call.targetPrice.toLocaleString(undefined, {
        maximumFractionDigits: 8,
      });

      if (status === 'success') {
        message = `✅ Your call for $${tokenDisplay} reached its target price of $${targetPriceFormatted}!`;
      } else {
        message = `❌ Your call for $${tokenDisplay} did not reach its target price of $${targetPriceFormatted}.`;
      }

      const metadata = {
        callId: call.id,
        tokenId: call.tokenId,
        tokenSymbol: token?.symbol,
        tokenName: token?.name,
        status: status,
        targetPrice: call.targetPrice,
        finalPrice: call.finalPriceAtTargetDate,
        peakPriceDuringPeriod: call.peakPriceDuringPeriod,
        targetHitTimestamp: call.targetHitTimestamp?.toISOString() || null,
        timeToHitRatio: call.timeToHitRatio,
      };

      await this.notificationService.createNotification(
        call.userId,
        notificationType,
        message,
        call.id,
        'token_call',
        metadata,
      );
    } catch (notificationError) {
      this.logger.error(
        `Failed to create notification for verified call ${call.id} for user ${call.userId}:`,
        notificationError,
      );
    }

    // 7. Check for Badges on Success
    if (call.status === TokenCallStatus.VERIFIED_SUCCESS) {
      try {
        await this.badgeService.checkTokenCallSuccessBadges(call.userId, call);
      } catch (badgeError) {
        this.logger.error(
          `Error checking badges for call ${call.id}:`,
          badgeError,
        );
      }
    }
  }

  /**
   * Updates the user's token call success streak based on the latest verified call.
   */
  private async updateUserTokenCallStreak(
    userId: string,
    callStatus: TokenCallStatus,
    verificationTimestamp: Date,
  ): Promise<void> {
    this.logger.debug(
      `Updating token call streak for user ${userId} based on status ${callStatus}`,
    );

    // Find or create the streak record
    let streak = await this.tokenCallStreakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.tokenCallStreakRepository.create({
        userId: userId,
        currentSuccessStreak: 0,
        longestSuccessStreak: 0,
        lastVerifiedCallTimestamp: null,
      });
    }

    const verificationTime =
      callStatus === TokenCallStatus.VERIFIED_SUCCESS
        ? verificationTimestamp
        : new Date();

    if (
      streak.lastVerifiedCallTimestamp &&
      verificationTime <= streak.lastVerifiedCallTimestamp
    ) {
      return;
    }

    if (callStatus === TokenCallStatus.VERIFIED_SUCCESS) {
      streak.currentSuccessStreak += 1;
      if (streak.currentSuccessStreak > streak.longestSuccessStreak) {
        streak.longestSuccessStreak = streak.currentSuccessStreak;
      }
    } else if (callStatus === TokenCallStatus.VERIFIED_FAIL) {
      if (streak.currentSuccessStreak > 0) {
        streak.currentSuccessStreak = 0;
      }
    }
    streak.lastVerifiedCallTimestamp = verificationTime;

    await this.tokenCallStreakRepository.save(streak);
  }
}
