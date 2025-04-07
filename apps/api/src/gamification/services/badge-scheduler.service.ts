import {
  BadgeRequirement,
  LeaderboardCategory,
  LeaderboardTimeframe,
  NotificationEventType,
} from '@dyor-hub/types'; // Assuming types exist
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  BadgeEntity,
  UserActivityEntity,
  UserBadgeEntity,
} from '../../entities';
import { BadgeService } from './badge.service';
import { LeaderboardService } from './leaderboard.service';

@Injectable()
export class BadgeSchedulerService {
  private readonly logger = new Logger(BadgeSchedulerService.name);
  // Flags to prevent concurrent job executions
  private isPeriodicJobRunning = false;
  private isWeeklyJobRunning = false;

  constructor(
    private readonly badgeService: BadgeService,
    private readonly leaderboardService: LeaderboardService,
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(BadgeEntity)
    private readonly badgeRepository: Repository<BadgeEntity>,
    @InjectRepository(UserBadgeEntity)
    private readonly userBadgeRepository: Repository<UserBadgeEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Periodically checks badges for users active within the last hour.
   * Runs every 15 minutes.
   */
  @Cron('0 */15 * * * *')
  async handlePeriodicBadgeCheck() {
    if (this.isPeriodicJobRunning) {
      this.logger.warn(
        'Skipping periodic badge check run - previous job still active.',
      );
      return;
    }

    this.isPeriodicJobRunning = true;
    const startTime = Date.now();
    this.logger.log(`Starting periodic badge check job...`);

    try {
      const activeSince = new Date(Date.now() - 60 * 60 * 1000);

      const recentUsers = await this.userActivityRepository
        .createQueryBuilder('activity')
        .select('activity.userId', 'userId')
        .where('activity.createdAt > :activeSince', { activeSince })
        .distinct(true)
        .getRawMany<{ userId: string }>();

      const userIdsToCheck = recentUsers.map((u) => u.userId);

      if (userIdsToCheck.length === 0) {
        this.logger.log('No recently active users found to check badges for.');
        this.isPeriodicJobRunning = false; // Ensure flag is reset
        return;
      }

      this.logger.log(
        `Found ${userIdsToCheck.length} recently active users to check badges for.`,
      );

      let usersProcessed = 0;
      let totalBadgesAwarded = 0;

      for (const userId of userIdsToCheck) {
        try {
          const awarded = await this.badgeService.checkAllUserBadges(userId);
          if (awarded.length > 0) {
            totalBadgesAwarded += awarded.length;
          }
          usersProcessed++;
        } catch (error) {
          this.logger.error(
            `Error checking badges for user ${userId} in periodic job: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Finished periodic badge check job in ${duration}ms. Processed ${usersProcessed}/${userIdsToCheck.length} users, awarded ${totalBadgesAwarded} badges.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete periodic badge check job: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isPeriodicJobRunning = false;
    }
  }

  /**
   * Awards badges based on leaderboard percentile ranking (e.g., TOP_PERCENT_WEEKLY).
   * Runs every Monday at 1 minute past midnight.
   */
  @Cron('1 0 * * MON')
  async handleWeeklyBadgeCheck() {
    if (this.isWeeklyJobRunning) {
      this.logger.warn(
        'Skipping weekly leaderboard badge check run - previous job still active.',
      );
      return;
    }

    this.isWeeklyJobRunning = true;
    const startTime = Date.now();
    this.logger.log(`Starting weekly leaderboard badge check job...`);
    let totalAwardedCount = 0;
    let totalCheckedBadges = 0;

    try {
      // 1. Find active badges that use the TOP_PERCENT_WEEKLY requirement
      const weeklyPercentBadges = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: BadgeRequirement.TOP_PERCENT_WEEKLY,
        },
      });

      if (weeklyPercentBadges.length === 0) {
        this.logger.log('No active weekly percentile badges found to process.');
        this.isWeeklyJobRunning = false;
        return;
      }
      this.logger.log(
        `Found ${weeklyPercentBadges.length} weekly percentile badges to process.`,
      );
      totalCheckedBadges = weeklyPercentBadges.length;

      // 2. Get total ranked users for the relevant leaderboard (All-Time Reputation)
      const leaderboardMetaResponse =
        await this.leaderboardService.getLeaderboard(
          LeaderboardCategory.REPUTATION,
          LeaderboardTimeframe.ALL_TIME,
          1,
          1, // Only need meta
        );
      const totalRankedUsers = leaderboardMetaResponse.meta?.total;

      if (totalRankedUsers === undefined || totalRankedUsers === 0) {
        this.logger.log(
          'No users found on the All-Time Reputation leaderboard. Skipping weekly awards.',
        );
        this.isWeeklyJobRunning = false;
        return;
      }

      // 3. Process each weekly percentile badge
      for (const badge of weeklyPercentBadges) {
        let awardedForThisBadge = 0;
        try {
          this.logger.log(`Processing badge: ${badge.name} (ID: ${badge.id})`);
          // Calculate how many users represent the target percentile
          const targetPercentile = badge.thresholdValue;
          const targetCount = Math.ceil(
            totalRankedUsers * (targetPercentile / 100),
          );

          if (targetCount <= 0) {
            this.logger.log(`Target count for ${badge.name} is 0. Skipping.`);
            continue; // Skip this badge if percentile threshold results in 0 users
          }

          // Fetch the exact users who fall into this top percentile
          const topUsersResponse = await this.leaderboardService.getLeaderboard(
            LeaderboardCategory.REPUTATION,
            LeaderboardTimeframe.ALL_TIME,
            1, // Page 1
            targetCount, // Limit to the calculated top N users
          );
          const topUserIds = topUsersResponse.users.map((u) => u.userId);

          if (topUserIds.length === 0) {
            this.logger.log(
              `No users found for top ${targetPercentile}% for badge ${badge.name}. Skipping.`,
            );
            continue;
          }

          this.logger.log(
            `Identified ${topUserIds.length} users potentially eligible for ${badge.name}.`,
          );

          // Find which of these top users already have this specific badge
          const existingUserBadges = await this.userBadgeRepository.find({
            where: { userId: In(topUserIds), badgeId: badge.id },
            select: ['userId'],
          });
          const usersWhoHaveBadge = new Set(
            existingUserBadges.map((ub) => ub.userId),
          );

          // Determine who needs the badge awarded
          const usersToAward = topUserIds.filter(
            (userId) => !usersWhoHaveBadge.has(userId),
          );

          this.logger.log(
            `Awarding ${badge.name} to ${usersToAward.length} new users.`,
          );

          // Award the badge directly
          for (const userId of usersToAward) {
            try {
              const newUserBadge = this.userBadgeRepository.create({
                userId: userId,
                badgeId: badge.id,
                isDisplayed: false,
              });
              await this.userBadgeRepository.save(newUserBadge);
              awardedForThisBadge++;

              this.eventEmitter.emit(NotificationEventType.BADGE_EARNED, {
                userId: userId,
                badgeId: badge.id,
                badgeName: badge.name,
              });
            } catch (awardError) {
              this.logger.error(
                `Failed to award badge ${badge.id} to user ${userId}: ${awardError.message}`,
              );
              // Continue to next user
            }
          }
          totalAwardedCount += awardedForThisBadge;
        } catch (badgeError) {
          this.logger.error(
            `Failed to process badge ${badge.id} (${badge.name}): ${badgeError.message}`,
            badgeError.stack,
          );
          // Continue to next badge
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Finished weekly leaderboard badge check job in ${duration}ms. Processed ${totalCheckedBadges} badges, awarded ${totalAwardedCount} total badges.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete weekly leaderboard badge check job: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isWeeklyJobRunning = false;
    }
  }
}
