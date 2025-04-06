import { NotificationEventType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserStreakEntity } from '../../entities';
import { ActivityTrackingService } from './activity-tracking.service';

@Injectable()
export class StreakSchedulerService {
  private readonly logger = new Logger(StreakSchedulerService.name);

  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
    @InjectRepository(UserStreakEntity)
    private userStreakRepository: Repository<UserStreakEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check for streaks at risk every hour during active hours
   * This runs at minute 0 of every hour from 8am to 11pm
   */
  @Cron('0 8-23 * * *')
  async checkStreaksAtRisk() {
    try {
      const streaksAtRisk =
        await this.activityTrackingService.getStreaksAtRisk();

      for (const streak of streaksAtRisk) {
        // Check if the user is actually at risk (20+ hours since last activity)
        const isAtRisk = await this.activityTrackingService.checkStreakAtRisk(
          streak.userId,
        );

        if (isAtRisk) {
          // Emit event for notification service to handle
          this.eventEmitter.emit(NotificationEventType.STREAK_AT_RISK, {
            userId: streak.userId,
            currentStreak: streak.currentStreak,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check streaks at risk: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reset streaks for users who didn't have activity yesterday
   * Runs at 12:01 AM every day
   */
  @Cron('1 0 * * *')
  async resetBrokenStreaks() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Find all users whose last activity was more than 1 day ago and have streak > 0
      const brokenStreaks = await this.userStreakRepository.find({
        where: {
          lastActivityDate: twoDaysAgo,
          currentStreak: MoreThan(0),
        },
      });

      for (const streak of brokenStreaks) {
        // Emit event for notification service to handle
        this.eventEmitter.emit(NotificationEventType.STREAK_BROKEN, {
          userId: streak.userId,
          previousStreak: streak.currentStreak,
        });

        // Reset streak
        streak.currentStreak = 0;
        await this.userStreakRepository.save(streak);
      }
    } catch (error) {
      this.logger.error(
        `Failed to reset broken streaks: ${error.message}`,
        error.stack,
      );
    }
  }
}
