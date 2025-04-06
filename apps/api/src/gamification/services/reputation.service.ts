import {
  ActivityPointsConfig,
  NotificationEventType,
  UserReputation,
  UserReputationTrends,
} from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  ActivityType,
  UserActivityEntity,
  UserReputationEntity,
} from '../../entities';
import {
  ACTIVITY_POINTS,
  MIN_WEEKLY_ACTIVITY_TO_PAUSE_REDUCTION,
  REDUCTION_CAPS,
  STREAK_MILESTONE_BONUS,
  WEEKLY_REDUCTION_PERCENTAGE,
} from '../constants/reputation-points';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    @InjectRepository(UserReputationEntity)
    private userReputationRepository: Repository<UserReputationEntity>,
    @InjectRepository(UserActivityEntity)
    private userActivityRepository: Repository<UserActivityEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Award points to a user for an activity
   */
  async awardPointsForActivity(
    userId: string,
    activityType: ActivityType,
  ): Promise<UserReputationEntity> {
    try {
      // Get or create user reputation record
      let reputation = await this.getUserReputation(userId);

      if (!reputation) {
        reputation = this.userReputationRepository.create({
          userId,
          totalPoints: 0,
          weeklyPoints: 0,
        });
      }

      // Award points based on activity type
      const pointsToAward = ACTIVITY_POINTS[activityType] || 0;

      if (pointsToAward > 0) {
        // Store the previous point total to check for milestones
        const previousPoints = reputation.totalPoints;

        // Update points
        reputation.totalPoints += pointsToAward;
        reputation.weeklyPoints += pointsToAward;

        await this.userReputationRepository.save(reputation);

        // Emit event for reputation change
        this.eventEmitter.emit('reputation.changed', {
          userId,
          oldTotal: previousPoints,
          newTotal: reputation.totalPoints,
          change: pointsToAward,
          reason: `${activityType} activity`,
        });

        // Check if user has reached a reputation milestone
        this.checkReputationMilestones(
          userId,
          previousPoints,
          reputation.totalPoints,
        );
      }

      return reputation;
    } catch (error) {
      this.logger.error(
        `Failed to award points to user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if user has reached any reputation milestones
   */
  private async checkReputationMilestones(
    userId: string,
    previousPoints: number,
    currentPoints: number,
  ): Promise<void> {
    try {
      // Define milestone reputation levels
      const milestones = [
        100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
      ];

      // Check if user has crossed any milestones
      for (const milestone of milestones) {
        if (previousPoints < milestone && currentPoints >= milestone) {
          // Emit milestone event for notification
          this.eventEmitter.emit(NotificationEventType.REPUTATION_MILESTONE, {
            userId,
            reputation: milestone,
          });

          // Only emit for the highest milestone crossed
          break;
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check reputation milestones: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Award bonus points for maintaining a streak
   */
  @OnEvent('streak.milestone')
  async awardStreakBonus(payload: {
    userId: string;
    currentStreak: number;
  }): Promise<void> {
    try {
      const { userId, currentStreak } = payload;

      // Find the highest milestone reached
      const milestones = Object.keys(STREAK_MILESTONE_BONUS)
        .map(Number)
        .sort((a, b) => b - a); // Sort descending

      let bonusPoints = 0;

      for (const milestone of milestones) {
        if (currentStreak >= milestone) {
          bonusPoints = STREAK_MILESTONE_BONUS[milestone];
          break;
        }
      }

      if (bonusPoints > 0) {
        let reputation = await this.getUserReputation(userId);

        if (!reputation) {
          reputation = this.userReputationRepository.create({
            userId,
            totalPoints: 0,
            weeklyPoints: 0,
          });
        }

        // Store previous points to check for milestones
        const previousPoints = reputation.totalPoints;

        reputation.totalPoints += bonusPoints;
        reputation.weeklyPoints += bonusPoints;

        await this.userReputationRepository.save(reputation);

        // Emit event for streak bonus
        this.eventEmitter.emit('reputation.changed', {
          userId,
          oldTotal: previousPoints,
          newTotal: reputation.totalPoints,
          change: bonusPoints,
          reason: `${currentStreak}-day streak bonus`,
        });

        // Check if user reached a milestone
        this.checkReputationMilestones(
          userId,
          previousPoints,
          reputation.totalPoints,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to award streak bonus: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly point reduction mechanism - runs every Monday at 00:00
   */
  @Cron(CronExpression.EVERY_WEEK)
  async applyWeeklyPointReduction(): Promise<void> {
    const startTime = new Date();
    this.logger.log(
      `Starting weekly point reduction job at ${startTime.toISOString()}`,
    );

    try {
      // Get all user reputations
      const userReputations = await this.userReputationRepository.find();
      this.logger.log(
        `Found ${userReputations.length} user reputation records to process`,
      );

      // Get time threshold for weekly activity check
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let processedUsers = 0;
      let reducedUsers = 0;
      let totalPointsReduced = 0;
      let skippedUsers = 0;

      for (const reputation of userReputations) {
        try {
          processedUsers++;

          // Check if user has enough activity to pause reduction
          const activityCount = await this.userActivityRepository.count({
            where: {
              userId: reputation.userId,
              createdAt: MoreThanOrEqual(oneWeekAgo),
            },
          });

          // Skip reduction if user meets the minimum activity threshold
          if (activityCount >= MIN_WEEKLY_ACTIVITY_TO_PAUSE_REDUCTION) {
            skippedUsers++;
            continue;
          }

          // Calculate reduction amount (percentage of weekly points)
          let reductionAmount = Math.floor(
            (reputation.weeklyPoints * WEEKLY_REDUCTION_PERCENTAGE) / 100,
          );

          // Apply tiered reduction cap based on total points
          let appliedCap;
          if (reputation.totalPoints <= REDUCTION_CAPS.BRONZE.maxPoints) {
            reductionAmount = Math.min(
              reductionAmount,
              REDUCTION_CAPS.BRONZE.maxReduction,
            );
            appliedCap = 'BRONZE';
          } else if (
            reputation.totalPoints <= REDUCTION_CAPS.SILVER.maxPoints
          ) {
            reductionAmount = Math.min(
              reductionAmount,
              REDUCTION_CAPS.SILVER.maxReduction,
            );
            appliedCap = 'SILVER';
          } else if (reputation.totalPoints <= REDUCTION_CAPS.GOLD.maxPoints) {
            reductionAmount = Math.min(
              reductionAmount,
              REDUCTION_CAPS.GOLD.maxReduction,
            );
            appliedCap = 'GOLD';
          } else {
            reductionAmount = Math.min(
              reductionAmount,
              REDUCTION_CAPS.PLATINUM.maxReduction,
            );
            appliedCap = 'PLATINUM';
          }

          if (reductionAmount > 0) {
            // Store old value for event emission
            const oldTotal = reputation.totalPoints;

            // Apply reduction to total and weekly points
            reputation.totalPoints = Math.max(
              0,
              reputation.totalPoints - reductionAmount,
            );
            reputation.weeklyPoints = Math.max(
              0,
              reputation.weeklyPoints - reductionAmount,
            );

            // Update last reset date
            reputation.weeklyPointsLastReset = new Date();

            await this.userReputationRepository.save(reputation);

            reducedUsers++;
            totalPointsReduced += reductionAmount;

            // Emit event for point reduction
            this.eventEmitter.emit('reputation.changed', {
              userId: reputation.userId,
              oldTotal,
              newTotal: reputation.totalPoints,
              change: -(oldTotal - reputation.totalPoints),
              reason: `Weekly point reduction (${appliedCap} tier, ${reductionAmount} points)`,
            });
          }
        } catch (userError) {
          this.logger.error(
            `Error processing reduction for user ${reputation.userId}: ${userError.message}`,
            userError.stack,
          );
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      this.logger.log(
        `Completed weekly point reduction job in ${duration}ms. ` +
          `Processed ${processedUsers} users, reduced points for ${reducedUsers} users, ` +
          `skipped ${skippedUsers} users due to activity level. ` +
          `Total points reduced: ${totalPointsReduced}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to apply weekly point reduction: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get user reputation
   */
  async getUserReputation(
    userId: string,
  ): Promise<UserReputationEntity | null> {
    try {
      return this.userReputationRepository.findOne({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get reputation for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get top users by reputation (leaderboard)
   */
  async getTopUsersByReputation(limit = 10): Promise<UserReputation[]> {
    try {
      const userReputations = await this.userReputationRepository.find({
        order: { totalPoints: 'DESC' },
        take: limit,
        relations: ['user'],
      });

      return userReputations.map((rep) => {
        if (!rep.user || !rep.user.username) {
          this.logger.error(
            `User data missing for reputation record ${rep.id} (userId: ${rep.userId})`,
          );
          throw new Error(`User data missing for reputation record`);
        }

        return {
          userId: rep.userId,
          username: rep.user.username,
          totalPoints: rep.totalPoints,
          weeklyPoints: rep.weeklyPoints,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get top users by reputation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get user reputation trends
   */
  async getUserReputationTrends(userId: string): Promise<UserReputationTrends> {
    try {
      // Get current reputation
      const reputation = await this.getUserReputation(userId);

      if (!reputation) {
        return {
          totalPoints: 0,
          weeklyPoints: 0,
          weeklyChange: 0,
          lastUpdated: new Date(),
        };
      }

      // Calculate weekly change from activity history
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get activities in the last week
      const recentActivities = await this.userActivityRepository.find({
        where: {
          userId,
          createdAt: MoreThanOrEqual(oneWeekAgo),
        },
        order: {
          createdAt: 'ASC',
        },
      });

      // Calculate weekly change based on activities
      let weeklyChange = 0;
      if (recentActivities.length > 0) {
        // Sum points from activities
        for (const activity of recentActivities) {
          weeklyChange += ACTIVITY_POINTS[activity.activityType] || 0;
        }
      }

      return {
        totalPoints: reputation.totalPoints,
        weeklyPoints: reputation.weeklyPoints,
        weeklyChange,
        lastUpdated: reputation.updatedAt || new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get reputation trends for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get activity point values for display in UI
   */
  getActivityPointValues(): ActivityPointsConfig {
    return {
      post: ACTIVITY_POINTS[ActivityType.POST],
      comment: ACTIVITY_POINTS[ActivityType.COMMENT],
      upvote: ACTIVITY_POINTS[ActivityType.UPVOTE],
      downvote: ACTIVITY_POINTS[ActivityType.DOWNVOTE],
      login: ACTIVITY_POINTS[ActivityType.LOGIN],
      weeklyDecayPercentage: WEEKLY_REDUCTION_PERCENTAGE,
      minWeeklyActivityToPauseReduction: MIN_WEEKLY_ACTIVITY_TO_PAUSE_REDUCTION,
      reductionTiers: {
        bronze: {
          maxPoints: REDUCTION_CAPS.BRONZE.maxPoints,
          maxReduction: REDUCTION_CAPS.BRONZE.maxReduction,
        },
        silver: {
          maxPoints: REDUCTION_CAPS.SILVER.maxPoints,
          maxReduction: REDUCTION_CAPS.SILVER.maxReduction,
        },
        gold: {
          maxPoints: REDUCTION_CAPS.GOLD.maxPoints,
          maxReduction: REDUCTION_CAPS.GOLD.maxReduction,
        },
        platinum: {
          maxPoints: REDUCTION_CAPS.PLATINUM.maxPoints,
          maxReduction: REDUCTION_CAPS.PLATINUM.maxReduction,
        },
      },
    };
  }
}
