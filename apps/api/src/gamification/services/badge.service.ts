import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityType,
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
}
