import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadgeEntity, UserBadgeEntity } from '../../entities';
import { CreateBadgeDto } from '../dto/create-badge.dto';
import { UpdateBadgeDto } from '../dto/update-badge.dto';

@Injectable()
export class BadgeAdminService {
  private readonly logger = new Logger(BadgeAdminService.name);

  constructor(
    @InjectRepository(BadgeEntity)
    private badgeRepository: Repository<BadgeEntity>,
    @InjectRepository(UserBadgeEntity)
    private userBadgeRepository: Repository<UserBadgeEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(): Promise<BadgeEntity[]> {
    try {
      const badges = await this.badgeRepository.find({
        order: {
          category: 'ASC',
          thresholdValue: 'ASC',
        },
      });

      const badgesWithCounts = await Promise.all(
        badges.map(async (badge) => {
          const awardCount = await this.userBadgeRepository.count({
            where: { badgeId: badge.id },
          });

          return {
            ...badge,
            awardCount,
          };
        }),
      );

      return badgesWithCounts;
    } catch (error) {
      this.logger.error(
        `Failed to fetch badges with award counts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<BadgeEntity> {
    const badge = await this.badgeRepository.findOne({
      where: { id },
    });

    if (!badge) {
      throw new NotFoundException(`Badge with ID ${id} not found`);
    }

    return badge;
  }

  async create(createBadgeDto: CreateBadgeDto): Promise<BadgeEntity> {
    try {
      const badge = this.badgeRepository.create(createBadgeDto);
      return await this.badgeRepository.save(badge);
    } catch (error) {
      this.logger.error(
        `Failed to create badge: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateBadgeDto: UpdateBadgeDto,
  ): Promise<BadgeEntity> {
    try {
      const badge = await this.findById(id);

      // Update badge properties
      Object.assign(badge, updateBadgeDto);

      return await this.badgeRepository.save(badge);
    } catch (error) {
      this.logger.error(
        `Failed to update badge ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const badge = await this.findById(id);

      // Check if badge is in use
      const usageCount = await this.userBadgeRepository.count({
        where: { badgeId: id },
      });

      if (usageCount > 0) {
        // Instead of deleting, just mark as inactive
        badge.isActive = false;
        await this.badgeRepository.save(badge);
      } else {
        // Safe to delete if not in use
        await this.badgeRepository.remove(badge);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete badge ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getBadgeStats(id: string): Promise<{
    badge: BadgeEntity;
    awardCount: number;
    recentActivity: UserBadgeEntity[];
  }> {
    try {
      const badge = await this.findById(id);

      const awardCount = await this.userBadgeRepository.count({
        where: { badgeId: id },
      });

      const recentActivity = await this.userBadgeRepository.find({
        where: { badgeId: id },
        relations: ['user'],
        order: { earnedAt: 'DESC' },
        take: 10,
      });

      return {
        badge,
        awardCount,
        recentActivity,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get badge stats for ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async awardBadgeToUser(
    badgeId: string,
    userId: string,
  ): Promise<UserBadgeEntity> {
    try {
      // Check if badge exists
      const badge = await this.findById(badgeId);

      // Check if user already has this badge
      const existingBadge = await this.userBadgeRepository.findOne({
        where: { userId, badgeId },
      });

      if (existingBadge) {
        throw new Error(`User ${userId} already has badge ${badge.name}`);
      }

      // Create new user badge
      const userBadge = this.userBadgeRepository.create({
        userId,
        badgeId,
        earnedAt: new Date(),
      });

      await this.userBadgeRepository.save(userBadge);

      // Emit event for notification
      this.eventEmitter.emit('badge.earned', {
        userId,
        badgeId,
        badgeName: badge.name,
      });

      return userBadge;
    } catch (error) {
      this.logger.error(
        `Failed to award badge ${badgeId} to user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async awardBadgeToUsers(
    badgeId: string,
    userIds: string[],
  ): Promise<{
    success: UserBadgeEntity[];
    failed: Array<{ userId: string; reason: string }>;
  }> {
    try {
      const badge = await this.findById(badgeId);
      const success: UserBadgeEntity[] = [];
      const failed: Array<{ userId: string; reason: string }> = [];

      // Process each user
      for (const userId of userIds) {
        try {
          // Check if user already has this badge
          const existingBadge = await this.userBadgeRepository.findOne({
            where: { userId, badgeId },
          });

          if (existingBadge) {
            failed.push({
              userId,
              reason: `User already has badge ${badge.name}`,
            });
            continue;
          }

          // Create new user badge
          const userBadge = this.userBadgeRepository.create({
            userId,
            badgeId,
            earnedAt: new Date(),
          });

          await this.userBadgeRepository.save(userBadge);
          success.push(userBadge);

          // Emit event for notification
          this.eventEmitter.emit('badge.earned', {
            userId,
            badgeId,
            badgeName: badge.name,
          });
        } catch (error) {
          failed.push({
            userId,
            reason: error.message,
          });
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error(
        `Failed to award badge ${badgeId} to users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getRecentActivity(limit: number): Promise<UserBadgeEntity[]> {
    try {
      return await this.userBadgeRepository.find({
        relations: ['user', 'badge'],
        order: { earnedAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch recent badge activity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
