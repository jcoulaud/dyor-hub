import { NotificationEventType } from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  ActivityType,
  UserActivityEntity,
  UserStreakEntity,
} from '../../entities';

/**
 * Helper function to get the start of the day in UTC
 */
const getUTCDayStart = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};

@Injectable()
export class ActivityTrackingService {
  private readonly logger = new Logger(ActivityTrackingService.name);

  constructor(
    @InjectRepository(UserActivityEntity)
    private userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(UserStreakEntity)
    private userStreakRepository: Repository<UserStreakEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async trackActivity(
    userId: string,
    activityType: ActivityType,
    entityId?: string,
    entityType?: string,
  ): Promise<UserActivityEntity> {
    try {
      // Create activity record
      const activity = this.userActivityRepository.create({
        userId,
        activityType,
        entityId: entityId || null,
        entityType: entityType || null,
      });

      await this.userActivityRepository.save(activity);

      // Update the user's streak
      await this.updateUserStreak(userId);

      return activity;
    } catch (error) {
      this.logger.error(
        `Failed to track activity for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to track user activity');
    }
  }

  async updateUserStreak(userId: string): Promise<UserStreakEntity> {
    try {
      let streak = await this.userStreakRepository.findOne({
        where: { userId },
      });

      if (!streak) {
        streak = this.userStreakRepository.create({
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
        });
      }

      // Use UTC for all date comparisons
      const nowUTC = new Date();
      const todayUTCStart = getUTCDayStart(nowUTC);

      const previousStreak = streak.currentStreak;

      // If this is the first activity ever
      if (!streak.lastActivityDate) {
        streak.currentStreak = 1;
        streak.longestStreak = 1;
        streak.lastActivityDate = todayUTCStart;
      } else {
        const lastActivityDateUTC = new Date(streak.lastActivityDate);
        const lastActivityUTCStart = getUTCDayStart(lastActivityDateUTC);

        const yesterdayUTCStart = new Date(todayUTCStart);
        yesterdayUTCStart.setUTCDate(yesterdayUTCStart.getUTCDate() - 1);

        // Calculate time difference in days based on UTC start dates
        const timeDiffDays = Math.floor(
          (todayUTCStart.getTime() - lastActivityUTCStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // If today is the same as last activity date (UTC), no streak update needed
        if (timeDiffDays === 0) {
          // Already recorded for today
        }
        // If yesterday (UTC) was the last activity, increment streak
        else if (timeDiffDays === 1) {
          streak.currentStreak += 1;

          // Update longest streak if current is now longer
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }

          streak.lastActivityDate = todayUTCStart;
        }
        // If more than one day has passed, reset streak
        else {
          streak.currentStreak = 1; // Reset to 1 for today's activity
          streak.lastActivityDate = todayUTCStart;
        }
      }

      await this.userStreakRepository.save(streak);

      // If streak reached a milestone, emit event
      const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
      if (
        streakMilestones.includes(streak.currentStreak) &&
        streak.currentStreak > previousStreak
      ) {
        this.eventEmitter.emit(NotificationEventType.STREAK_MILESTONE, {
          userId,
          currentStreak: streak.currentStreak,
        });
      }

      return streak;
    } catch (error) {
      this.logger.error(
        `Failed to update streak for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update user streak');
    }
  }

  async getUserStreak(userId: string): Promise<UserStreakEntity | null> {
    try {
      return this.userStreakRepository.findOne({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get streak for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve user streak');
    }
  }

  /**
   * Checks if a user's streak is at risk of ending.
   * A streak is considered at risk if the last recorded activity
   * occurred during the previous UTC day.
   */
  async checkStreakAtRisk(userId: string): Promise<boolean> {
    try {
      const streak = await this.getUserStreak(userId);

      // No risk if no streak, streak is 0, or no activity recorded yet.
      if (!streak || streak.currentStreak === 0 || !streak.lastActivityDate) {
        return false;
      }

      // lastActivityDate is stored normalized to the start of the UTC day.
      const lastActivityUTCStart = getUTCDayStart(
        new Date(streak.lastActivityDate),
      );

      // Get the start of yesterday UTC.
      const yesterdayUTCStart = getUTCDayStart(new Date());
      yesterdayUTCStart.setUTCDate(yesterdayUTCStart.getUTCDate() - 1);

      // The streak is at risk if the last recorded activity day (UTC start) was yesterday.
      return lastActivityUTCStart.getTime() === yesterdayUTCStart.getTime();
    } catch (error) {
      this.logger.error(
        `Failed to check streak at risk for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to check streak risk status',
      );
    }
  }

  async getStreaksAtRisk(): Promise<UserStreakEntity[]> {
    try {
      // Find streaks where last activity was yesterday (UTC)
      const todayUTCStart = getUTCDayStart(new Date());
      const yesterdayUTCStart = new Date(todayUTCStart);
      yesterdayUTCStart.setUTCDate(yesterdayUTCStart.getUTCDate() - 1);

      return this.userStreakRepository.find({
        where: {
          lastActivityDate: yesterdayUTCStart, // Check for exact match to start of yesterday UTC
          currentStreak: MoreThan(0),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get streaks at risk: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve streaks at risk',
      );
    }
  }
}
