import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityType,
  BadgeCategory,
  BadgeEntity,
  UserActivityEntity,
  UserBadgeEntity,
} from '../../entities';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @InjectRepository(BadgeEntity)
    private badgeRepository: Repository<BadgeEntity>,
    @InjectRepository(UserBadgeEntity)
    private userBadgeRepository: Repository<UserBadgeEntity>,
    @InjectRepository(UserActivityEntity)
    private userActivityRepository: Repository<UserActivityEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async checkAndAwardBadges(userId: string): Promise<UserBadgeEntity[]> {
    try {
      // Get all available badges
      const badges = await this.badgeRepository.find({
        where: { isActive: true },
      });

      // Get badges that user already has
      const userBadges = await this.userBadgeRepository.find({
        where: { userId },
        relations: ['badge'],
      });

      // Find badges the user doesn't have yet
      const userBadgeIds = userBadges.map((ub) => ub.badgeId);
      const availableBadges = badges.filter(
        (badge) => !userBadgeIds.includes(badge.id),
      );

      if (availableBadges.length === 0) {
        return [];
      }

      const newlyAwardedBadges: UserBadgeEntity[] = [];

      // Check each badge requirement
      for (const badge of availableBadges) {
        const isEligible = await this.checkBadgeEligibility(userId, badge);

        if (isEligible) {
          // Award the badge
          const userBadge = this.userBadgeRepository.create({
            userId,
            badgeId: badge.id,
            earnedAt: new Date(),
          });

          await this.userBadgeRepository.save(userBadge);
          newlyAwardedBadges.push(userBadge);

          // Emit event for notification service
          this.eventEmitter.emit('badge.earned', {
            userId,
            badgeId: badge.id,
            badgeName: badge.name,
          });
        }
      }

      return newlyAwardedBadges;
    } catch (error) {
      this.logger.error(
        `Failed to check and award badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async checkBadgeEligibility(
    userId: string,
    badge: BadgeEntity,
  ): Promise<boolean> {
    try {
      switch (badge.requirement) {
        case 'current_streak':
          return this.checkStreakRequirement(userId, badge.thresholdValue);
        case 'posts_count':
          return this.checkActivityCountRequirement(
            userId,
            ActivityType.POST,
            badge.thresholdValue,
          );
        case 'comments_count':
          return this.checkActivityCountRequirement(
            userId,
            ActivityType.COMMENT,
            badge.thresholdValue,
          );
        case 'upvotes_given_count':
          return this.checkActivityCountRequirement(
            userId,
            ActivityType.UPVOTE,
            badge.thresholdValue,
          );
        default:
          this.logger.warn(
            `Unknown badge requirement: ${badge.requirement} for badge ${badge.name}`,
          );
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Error checking badge eligibility for user ${userId}, badge ${badge.name}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private async checkStreakRequirement(
    userId: string,
    requiredStreak: number,
  ): Promise<boolean> {
    const query = `
      SELECT current_streak 
      FROM user_streaks 
      WHERE user_id = $1
    `;

    const result = await this.userActivityRepository.query(query, [userId]);

    if (result.length === 0) {
      return false;
    }

    return parseInt(result[0].current_streak, 10) >= requiredStreak;
  }

  private async checkActivityCountRequirement(
    userId: string,
    activityType: ActivityType,
    requiredCount: number,
  ): Promise<boolean> {
    const count = await this.userActivityRepository.count({
      where: {
        userId,
        activityType,
      },
    });

    return count >= requiredCount;
  }

  async getUserBadges(userId: string): Promise<UserBadgeEntity[]> {
    try {
      return this.userBadgeRepository.find({
        where: { userId },
        relations: ['badge'],
        order: { earnedAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async toggleBadgeDisplay(
    userId: string,
    badgeId: string,
    isDisplayed: boolean,
  ): Promise<UserBadgeEntity> {
    try {
      const userBadge = await this.userBadgeRepository.findOne({
        where: {
          userId,
          badgeId,
        },
      });

      if (!userBadge) {
        throw new Error(
          `User badge not found for user ${userId} and badge ${badgeId}`,
        );
      }

      userBadge.isDisplayed = isDisplayed;
      return this.userBadgeRepository.save(userBadge);
    } catch (error) {
      this.logger.error(
        `Failed to toggle badge display for user ${userId}, badge ${badgeId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAllBadgeCategories(): Promise<BadgeCategory[]> {
    return Object.values(BadgeCategory);
  }

  async getBadgesByCategory(category: BadgeCategory): Promise<BadgeEntity[]> {
    try {
      return this.badgeRepository.find({
        where: { category, isActive: true },
        order: { thresholdValue: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get badges for category ${category}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAvailableBadges(userId: string): Promise<
    {
      category: BadgeCategory;
      badges: Array<BadgeEntity & { earned: boolean; progress?: number }>;
    }[]
  > {
    try {
      // Get all active badges
      const badges = await this.badgeRepository.find({
        where: { isActive: true },
        order: { category: 'ASC', thresholdValue: 'ASC' },
      });

      // Get badges that user already has
      const userBadges = await this.userBadgeRepository.find({
        where: { userId },
      });
      const earnedBadgeIds = userBadges.map((ub) => ub.badgeId);

      // Group badges by category
      const badgesByCategory = badges.reduce(
        (result, badge) => {
          const earned = earnedBadgeIds.includes(badge.id);
          const category = badge.category;

          if (!result[category]) {
            result[category] = [];
          }

          // Clone the badge and add earned status
          result[category].push({
            ...badge,
            earned,
          });

          return result;
        },
        {} as Record<
          BadgeCategory,
          Array<BadgeEntity & { earned: boolean; progress?: number }>
        >,
      );

      // Calculate progress for unearnedBadges
      for (const category in badgesByCategory) {
        for (const badge of badgesByCategory[category]) {
          if (!badge.earned) {
            badge.progress = await this.calculateBadgeProgress(userId, badge);
          }
        }
      }

      // Transform to array format
      return Object.entries(badgesByCategory).map(([category, badges]) => ({
        category: category as BadgeCategory,
        badges,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get available badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async calculateBadgeProgress(
    userId: string,
    badge: BadgeEntity,
  ): Promise<number> {
    try {
      let current = 0;
      const target = badge.thresholdValue;

      switch (badge.requirement) {
        case 'current_streak': {
          const query = `
            SELECT current_streak 
            FROM user_streaks 
            WHERE user_id = $1
          `;
          const result = await this.userActivityRepository.query(query, [
            userId,
          ]);
          current =
            result.length > 0 ? parseInt(result[0].current_streak, 10) : 0;
          break;
        }
        case 'posts_count':
          current = await this.userActivityRepository.count({
            where: { userId, activityType: ActivityType.POST },
          });
          break;
        case 'comments_count':
          current = await this.userActivityRepository.count({
            where: { userId, activityType: ActivityType.COMMENT },
          });
          break;
        case 'upvotes_given_count':
          current = await this.userActivityRepository.count({
            where: { userId, activityType: ActivityType.UPVOTE },
          });
          break;
        default:
          return 0;
      }

      // Calculate percentage (0-100)
      return Math.min(100, Math.round((current / target) * 100));
    } catch (error) {
      this.logger.error(
        `Error calculating badge progress: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  async getUserBadgeSummary(userId: string): Promise<{
    totalBadges: number;
    recentBadges: UserBadgeEntity[];
    badgesByCategory: Record<BadgeCategory, number>;
  }> {
    try {
      const userBadges = await this.userBadgeRepository.find({
        where: { userId },
        relations: ['badge'],
        order: { earnedAt: 'DESC' },
      });

      const badgesByCategory = userBadges.reduce(
        (acc, userBadge) => {
          const category = userBadge.badge.category;
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        },
        {} as Record<BadgeCategory, number>,
      );

      return {
        totalBadges: userBadges.length,
        recentBadges: userBadges.slice(0, 5),
        badgesByCategory,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user badge summary for ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
