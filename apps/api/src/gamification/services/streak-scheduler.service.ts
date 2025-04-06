import { NotificationEventType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { UserStreakEntity } from '../../entities';
import { ActivityTrackingService } from './activity-tracking.service';

@Injectable()
export class StreakSchedulerService {
  private readonly logger = new Logger(StreakSchedulerService.name);

  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(UserStreakEntity)
    private readonly userStreakRepository: Repository<UserStreakEntity>,
  ) {}

  /**
   * Check for streaks at risk every hour during active hours
   * This runs at minute 0 of every hour from 8am to 11pm
   */
  @Cron('0 8-23 * * *')
  async checkStreaksAtRisk() {
    const startTime = new Date();
    this.logger.log(
      `Starting streak at-risk check job at ${startTime.toISOString()}`,
    );

    try {
      const streaksAtRisk =
        await this.activityTrackingService.getStreaksAtRisk();
      this.logger.log(`Found ${streaksAtRisk.length} streaks at risk`);

      let notificationsCount = 0;
      for (const streak of streaksAtRisk) {
        try {
          // Check if user should get a notification
          const isAtRisk = await this.activityTrackingService.checkStreakAtRisk(
            streak.userId,
          );

          if (isAtRisk) {
            // Emit event for notification
            this.eventEmitter.emit(NotificationEventType.STREAK_AT_RISK, {
              userId: streak.userId,
              currentStreak: streak.currentStreak,
            });
            notificationsCount++;
          }
        } catch (userError) {
          this.logger.error(
            `Error processing streak at-risk check for user ${streak.userId}: ${userError.message}`,
            userError.stack,
          );
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      this.logger.log(
        `Completed streak at-risk check job in ${duration}ms. Sent ${notificationsCount} notifications out of ${streaksAtRisk.length} eligible streaks.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete streak at-risk check job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reset streaks for users who didn't have activity yesterday
   * Runs at 12:01 AM every day
   */
  @Cron('1 0 * * *')
  async resetLapsedStreaks() {
    const startTime = new Date();
    this.logger.log(`Starting streak reset job at ${startTime.toISOString()}`);

    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Find all streaks that haven't had activity since before yesterday
      const lapsedStreaks = await this.userStreakRepository.find({
        where: {
          lastActivityDate: LessThan(yesterday),
          currentStreak: MoreThan(0), // Only reset non-zero streaks
        },
      });

      this.logger.log(`Found ${lapsedStreaks.length} lapsed streaks to reset`);

      let resetCount = 0;
      for (const streak of lapsedStreaks) {
        try {
          // Store the value before reset for notification
          const previousStreak = streak.currentStreak;

          // Reset streak to 0
          streak.currentStreak = 0;
          await this.userStreakRepository.save(streak);
          resetCount++;

          // Emit event for notification
          this.eventEmitter.emit(NotificationEventType.STREAK_BROKEN, {
            userId: streak.userId,
            previousStreak,
          });
        } catch (userError) {
          this.logger.error(
            `Error resetting streak for user ${streak.userId}: ${userError.message}`,
            userError.stack,
          );
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      this.logger.log(
        `Completed streak reset job in ${duration}ms. Reset ${resetCount} out of ${lapsedStreaks.length} eligible streaks.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete streak reset job: ${error.message}`,
        error.stack,
      );
    }
  }
}
