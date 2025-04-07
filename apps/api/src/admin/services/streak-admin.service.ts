import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserEntity, UserStreakEntity } from '../../entities';

@Injectable()
export class StreakAdminService {
  private readonly logger = new Logger(StreakAdminService.name);

  constructor(
    @InjectRepository(UserStreakEntity)
    private userStreakRepository: Repository<UserStreakEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async getStreakOverview() {
    try {
      // Get total active streaks
      const activeStreaksCount = await this.userStreakRepository.count({
        where: {
          currentStreak: MoreThan(0),
        },
      });

      // Get streaks at risk
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const streaksAtRiskCount = await this.userStreakRepository.count({
        where: {
          lastActivityDate: yesterday,
          currentStreak: MoreThan(0),
        },
      });

      // Get milestone counts
      const milestones = [3, 7, 14, 30, 60, 100, 180, 365];
      const milestoneCounts = {} as Record<number, number>;

      for (const milestone of milestones) {
        const count = await this.userStreakRepository.count({
          where: {
            currentStreak: MoreThan(milestone - 1),
          },
        });
        milestoneCounts[milestone] = count;
      }

      return {
        activeStreaksCount,
        streaksAtRiskCount,
        milestoneCounts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get streak overview: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTopStreakUsers(limit = 10) {
    try {
      const topCurrentStreaks = await this.userStreakRepository.find({
        where: {
          currentStreak: MoreThan(0),
        },
        order: {
          currentStreak: 'DESC',
        },
        take: limit,
        relations: ['user'],
      });

      const topAllTimeStreaks = await this.userStreakRepository.find({
        where: {
          longestStreak: MoreThan(0),
        },
        order: {
          longestStreak: 'DESC',
        },
        take: limit,
        relations: ['user'],
      });

      return {
        topCurrentStreaks: topCurrentStreaks.map((streak) => ({
          id: streak.id,
          userId: streak.userId,
          username: streak.user.username,
          currentStreak: streak.currentStreak,
          lastActivityDate: streak.lastActivityDate,
        })),
        topAllTimeStreaks: topAllTimeStreaks.map((streak) => ({
          id: streak.id,
          userId: streak.userId,
          username: streak.user.username,
          longestStreak: streak.longestStreak,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get top streak users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
