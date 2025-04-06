import { NotificationEventType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  ActivityType,
  UserActivityEntity,
  UserStreakEntity,
} from '../../entities';

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
      throw error;
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

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      const previousStreak = streak.currentStreak;

      // If this is the first activity ever
      if (!streak.lastActivityDate) {
        streak.currentStreak = 1;
        streak.longestStreak = 1;
        streak.lastActivityDate = today;
      } else {
        const lastActivityDate = new Date(streak.lastActivityDate);
        lastActivityDate.setHours(0, 0, 0, 0); // Normalize to start of day

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Calculate time difference in days
        const timeDiff = Math.floor(
          (today.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24),
        );

        // If today is the same as last activity date, no streak update needed
        if (timeDiff === 0) {
          // Already recorded for today
        }
        // If yesterday was the last activity, increment streak
        if (timeDiff === 1) {
          streak.currentStreak += 1;

          // Update longest streak if current is now longer
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }

          streak.lastActivityDate = today;
        }
        // If more than one day has passed, reset streak
        else {
          streak.currentStreak = 1; // Reset to 1 for today's activity
          streak.lastActivityDate = today;
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
      throw error;
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
      throw error;
    }
  }

  async checkStreakAtRisk(userId: string): Promise<boolean> {
    try {
      const streak = await this.getUserStreak(userId);

      if (!streak || streak.currentStreak === 0) {
        return false;
      }

      // If no streak or last activity date, not at risk
      if (!streak.lastActivityDate) {
        return false;
      }

      const lastActivity = new Date(streak.lastActivityDate);
      const now = new Date();

      // Calculate hours since last activity
      const hoursSinceLastActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      // At risk if more than 20 hours since last activity
      return hoursSinceLastActivity >= 20 && hoursSinceLastActivity < 24;
    } catch (error) {
      this.logger.error(
        `Failed to check streak at risk for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getStreaksAtRisk(): Promise<UserStreakEntity[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find streaks where last activity was yesterday and streak is > 0
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      return this.userStreakRepository.find({
        where: {
          lastActivityDate: yesterday,
          currentStreak: MoreThan(0),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get streaks at risk: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
