import {
  LeaderboardCategory,
  LeaderboardResponse,
  LeaderboardTimeframe,
  NotificationEventType,
  UserReputation,
} from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  CommentEntity,
  CommentVoteEntity,
  LeaderboardEntity,
  UserActivityEntity,
  UserEntity,
} from '../../entities';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(LeaderboardEntity)
    private leaderboardRepository: Repository<LeaderboardEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserActivityEntity)
    private userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private commentVoteRepository: Repository<CommentVoteEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get leaderboard for a specific category and timeframe
   */
  async getLeaderboard(
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<LeaderboardResponse> {
    try {
      // Ensure page and pageSize are valid
      const validPage = Math.max(1, page);
      const validPageSize = Math.min(100, Math.max(5, pageSize)); // Min 5, max 100 items per page

      // Calculate skip value for pagination
      const skip = (validPage - 1) * validPageSize;

      // Get total count for pagination - only count users with points > 0
      const totalCount = await this.leaderboardRepository.count({
        where: { category, timeframe, score: MoreThan(0) },
      });

      // Get paginated results - only include users with points > 0
      const leaderboard = await this.leaderboardRepository.find({
        where: { category, timeframe, score: MoreThan(0) },
        order: { score: 'DESC', rank: 'ASC' }, // Order primarily by score, then by rank
        skip: skip,
        take: validPageSize,
        relations: ['user'],
      });

      const users: UserReputation[] = leaderboard.map((entry) => ({
        userId: entry.userId,
        username: entry.user.username,
        displayName: entry.user.displayName,
        avatarUrl: entry.user.avatarUrl || null,
        totalPoints: entry.score,
        weeklyPoints: entry.score, // For non-reputation categories, total = weekly
      }));

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / validPageSize);

      return {
        users,
        timestamp: new Date(),
        meta: {
          total: totalCount,
          page: validPage,
          pageSize: validPageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get leaderboard for ${category}/${timeframe}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a user's rank across all categories and timeframes
   */
  async getUserRanks(userId: string): Promise<
    {
      category: LeaderboardCategory;
      timeframe: LeaderboardTimeframe;
      rank: number;
      score: number;
      previousRank: number | null;
    }[]
  > {
    try {
      const entries = await this.leaderboardRepository.find({
        where: { userId },
      });

      return entries.map((entry) => ({
        category: entry.category,
        timeframe: entry.timeframe,
        rank: entry.rank,
        score: entry.score,
        previousRank: entry.previousRank,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get ranks for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Daily calculation of all leaderboards (runs at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async calculateDailyLeaderboards(): Promise<void> {
    const startTime = new Date();
    this.logger.log(
      `Starting daily leaderboard calculation job at ${startTime.toISOString()}`,
    );

    try {
      // Calculate for each timeframe and category combination
      for (const timeframe of Object.values(LeaderboardTimeframe)) {
        for (const category of Object.values(LeaderboardCategory)) {
          try {
            await this.updateLeaderboard(category, timeframe);
            this.logger.log(
              `Successfully calculated ${timeframe} ${category} leaderboard`,
            );
          } catch (error) {
            this.logger.error(
              `Error calculating ${timeframe} ${category} leaderboard: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const totalLeaderboards =
        Object.values(LeaderboardTimeframe).length *
        Object.values(LeaderboardCategory).length;

      this.logger.log(
        `Completed daily leaderboard calculation job in ${duration}ms. ` +
          `Processed ${totalLeaderboards} leaderboards.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run daily leaderboard calculations: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weekly notification of position changes (runs every Monday)
   */
  @Cron(CronExpression.EVERY_WEEK)
  async notifyWeeklyPositionChanges() {
    const startTime = new Date();
    this.logger.log(
      `Starting weekly leaderboard position notification job at ${startTime.toISOString()}`,
    );

    try {
      // For each user with a non-trivial ranking, check if there's been a significant change
      const users = await this.userRepository.find({
        select: ['id'],
      });

      this.logger.log(
        `Found ${users.length} users to check for significant ranking changes`,
      );

      let notificationsCount = 0;
      let usersWithChanges = 0;
      let usersProcessed = 0;

      for (const user of users) {
        try {
          usersProcessed++;
          const userId = user.id;

          // Get the user's current rankings
          const currentRankings = await this.getUserRanks(userId);
          if (!currentRankings || currentRankings.length === 0) continue;

          // Get previous ranks from user's rankings
          const previousRankings = currentRankings.filter(
            (rank) => rank.previousRank !== null,
          );
          if (previousRankings.length === 0) continue;

          let userHasChanges = false;

          // Check each ranking for meaningful changes
          for (const ranking of currentRankings) {
            const { category, timeframe, rank, previousRank } = ranking;

            if (previousRank === null) continue;

            // Check if ranking has changed significantly (more than 5 positions)
            // or the user has moved into or out of the top 10
            const significant =
              Math.abs(rank - previousRank) > 5 ||
              (rank <= 10 && previousRank > 10) ||
              (rank > 10 && previousRank <= 10);

            // Check if the ranking has improved to a meaningful milestone
            // (top 50, top 25, top 10, top 5, or #1)
            const milestone =
              (rank === 1 && previousRank > 1) ||
              (rank <= 5 && previousRank > 5) ||
              (rank <= 10 && previousRank > 10) ||
              (rank <= 25 && previousRank > 25) ||
              (rank <= 50 && previousRank > 50);

            if (significant || milestone) {
              // Send notification about ranking change
              this.eventEmitter.emit(
                NotificationEventType.LEADERBOARD_POSITION_CHANGE,
                {
                  userId,
                  newPosition: rank,
                  previousPosition: previousRank,
                  category,
                  timeframe,
                },
              );
              notificationsCount++;
              userHasChanges = true;
            }
          }

          if (userHasChanges) {
            usersWithChanges++;
          }
        } catch (userError) {
          this.logger.error(
            `Error processing ranking changes for user ${user.id}: ${userError.message}`,
            userError.stack,
          );
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      this.logger.log(
        `Completed weekly leaderboard position notification job in ${duration}ms. ` +
          `Processed ${usersProcessed} users, found ${usersWithChanges} users with significant changes, ` +
          `sent ${notificationsCount} notifications.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify weekly position changes: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update all leaderboards - runs automatically via cron but can also be triggered manually
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllLeaderboards(): Promise<void> {
    try {
      const validCategories = Object.values(LeaderboardCategory);

      // Update each category and timeframe
      for (const category of validCategories) {
        for (const timeframe of Object.values(LeaderboardTimeframe)) {
          await this.updateLeaderboard(category, timeframe);
        }
      }
    } catch (error) {
      this.logger.error(
        `Leaderboard update process failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update a specific leaderboard category and timeframe
   */
  private async updateLeaderboard(
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
  ): Promise<void> {
    try {
      // Validate that the category is actually in the enum
      const validCategories = Object.values(LeaderboardCategory);
      if (!validCategories.includes(category as LeaderboardCategory)) {
        this.logger.error(`Invalid leaderboard category: ${category}`);
        return; // Skip invalid categories
      }

      // Get existing leaderboard entries to track position changes
      const existingEntries = await this.leaderboardRepository.find({
        where: { category, timeframe },
      });

      // Calculate scores based on category and timeframe
      const scores = await this.calculateScores(category, timeframe);

      // Sort by score (descending) and assign ranks
      scores.sort((a, b) => b.score - a.score);

      // Create a map of existing entries for quick lookup
      const existingEntriesMap = new Map(
        existingEntries.map((entry) => [entry.userId, entry]),
      );

      // Prepare batch operations
      const updatedEntries: LeaderboardEntity[] = [];

      for (let i = 0; i < scores.length; i++) {
        const { userId, score } = scores[i];
        const rank = i + 1; // Ranks start at 1

        // Check if user already has an entry
        const existingEntry = existingEntriesMap.get(userId);

        if (existingEntry) {
          // Update existing entry
          existingEntry.score = score;
          existingEntry.previousRank = existingEntry.rank;
          existingEntry.rank = rank;
          updatedEntries.push(existingEntry);

          // Check for significant rank changes (improved by 3+ positions)
          if (
            existingEntry.previousRank &&
            existingEntry.previousRank - rank >= 3
          ) {
            await this.notifyRankImprovement(
              userId,
              category,
              timeframe,
              rank,
              existingEntry.previousRank,
            );
          }
        } else {
          // Create new entry
          const newEntry = this.leaderboardRepository.create({
            userId,
            category,
            timeframe,
            rank,
            score,
            previousRank: null,
          });
          updatedEntries.push(newEntry);
        }
      }

      await this.leaderboardRepository.upsert(updatedEntries, [
        'userId',
        'category',
        'timeframe',
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to update ${category}/${timeframe} leaderboard: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate scores for a specific category and timeframe
   */
  private async calculateScores(
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
  ): Promise<{ userId: string; score: number }[]> {
    // Validate the category is a valid enum value
    const validCategories = Object.values(LeaderboardCategory);
    if (!validCategories.includes(category as LeaderboardCategory)) {
      this.logger.error(
        `Invalid leaderboard category in calculateScores: ${category}`,
      );
      return []; // Return empty array for invalid categories
    }

    // Get date threshold based on timeframe
    const dateThreshold = this.getDateThreshold(timeframe);

    switch (category) {
      case LeaderboardCategory.POSTS:
        return this.calculatePostScores(dateThreshold);
      case LeaderboardCategory.COMMENTS:
        return this.calculateCommentScores(dateThreshold);
      case LeaderboardCategory.UPVOTES_GIVEN:
        return this.calculateUpvotesGivenScores(dateThreshold);
      case LeaderboardCategory.UPVOTES_RECEIVED:
        return this.calculateUpvotesReceivedScores(dateThreshold);
      case LeaderboardCategory.REPUTATION:
        return this.calculateReputationScores(timeframe);
      default:
        throw new Error(`Unsupported category: ${category}`);
    }
  }

  /**
   * Calculate post scores
   */
  private async calculatePostScores(
    dateThreshold: Date | null,
  ): Promise<{ userId: string; score: number }[]> {
    const queryBuilder = this.userActivityRepository
      .createQueryBuilder('activity')
      .select('activity.userId', 'userId')
      .addSelect('COUNT(*)', 'score')
      .where('activity.activityType = :activityType', { activityType: 'post' });

    if (dateThreshold) {
      queryBuilder.andWhere('activity.createdAt >= :threshold', {
        threshold: dateThreshold,
      });
    }

    queryBuilder.groupBy('activity.userId');

    const results = await queryBuilder.getRawMany();
    return results.map((result) => ({
      userId: result.userId,
      score: parseInt(result.score, 10),
    }));
  }

  /**
   * Calculate comment scores
   */
  private async calculateCommentScores(
    dateThreshold: Date | null,
  ): Promise<{ userId: string; score: number }[]> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .select('comment.userId', 'userId')
      .addSelect('COUNT(*)', 'score');

    if (dateThreshold) {
      queryBuilder.where('comment.createdAt >= :threshold', {
        threshold: dateThreshold,
      });
    }

    queryBuilder.groupBy('comment.userId');

    const results = await queryBuilder.getRawMany();
    return results.map((result) => ({
      userId: result.userId,
      score: parseInt(result.score, 10),
    }));
  }

  /**
   * Calculate upvotes given scores
   */
  private async calculateUpvotesGivenScores(
    dateThreshold: Date | null,
  ): Promise<{ userId: string; score: number }[]> {
    const queryBuilder = this.commentVoteRepository
      .createQueryBuilder('vote')
      .select('vote.userId', 'userId')
      .addSelect('COUNT(*)', 'score')
      .where('vote.type = :voteType', { voteType: 'upvote' });

    if (dateThreshold) {
      queryBuilder.andWhere('vote.createdAt >= :threshold', {
        threshold: dateThreshold,
      });
    }

    queryBuilder.groupBy('vote.userId');

    const results = await queryBuilder.getRawMany();
    return results.map((result) => ({
      userId: result.userId,
      score: parseInt(result.score, 10),
    }));
  }

  /**
   * Calculate upvotes received scores
   */
  private async calculateUpvotesReceivedScores(
    dateThreshold: Date | null,
  ): Promise<{ userId: string; score: number }[]> {
    const queryBuilder = this.commentVoteRepository
      .createQueryBuilder('vote')
      .innerJoin('comments', 'comment', 'vote.commentId = comment.id')
      .select('comment.userId', 'userId')
      .addSelect('COUNT(*)', 'score')
      .where('vote.type = :voteType', { voteType: 'upvote' });

    if (dateThreshold) {
      queryBuilder.andWhere('vote.createdAt >= :threshold', {
        threshold: dateThreshold,
      });
    }

    queryBuilder.groupBy('comment.userId');

    const results = await queryBuilder.getRawMany();
    return results.map((result) => ({
      userId: result.userId,
      score: parseInt(result.score, 10),
    }));
  }

  /**
   * Calculate reputation scores
   */
  private async calculateReputationScores(
    timeframe: LeaderboardTimeframe,
  ): Promise<{ userId: string; score: number }[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .innerJoin(
        'user_reputations',
        'reputation',
        'user.id = reputation.userId',
      )
      .select('user.id', 'userId');

    // Select appropriate score field based on timeframe
    if (timeframe === LeaderboardTimeframe.WEEKLY) {
      queryBuilder.addSelect('reputation.weeklyPoints', 'score');
    } else {
      queryBuilder.addSelect('reputation.totalPoints', 'score');
    }

    // Only include users with positive points
    queryBuilder.where('reputation.totalPoints > 0');

    const results = await queryBuilder.getRawMany();
    return results.map((result) => ({
      userId: result.userId,
      score: parseInt(result.score, 10),
    }));
  }

  /**
   * Helper to get date threshold based on timeframe
   */
  private getDateThreshold(timeframe: LeaderboardTimeframe): Date | null {
    const now = new Date();

    switch (timeframe) {
      case LeaderboardTimeframe.WEEKLY:
        now.setDate(now.getDate() - 7);
        return now;
      case LeaderboardTimeframe.MONTHLY:
        now.setMonth(now.getMonth() - 1);
        return now;
      case LeaderboardTimeframe.ALL_TIME:
        return null; // No threshold for all-time
      default:
        throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
  }

  private async notifyRankImprovement(
    userId: string,
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
    newRank: number,
    oldRank: number,
  ): Promise<void> {
    try {
      // Only notify for significant improvements (10+ positions)
      if (oldRank - newRank < 10) {
        return;
      }

      // Emit event for notification service to handle
      this.eventEmitter.emit(
        NotificationEventType.LEADERBOARD_POSITION_CHANGE,
        {
          userId,
          newPosition: newRank,
          previousPosition: oldRank,
          category,
          timeframe,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send rank notification to user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Run weekly leaderboard reset - resets weekly counters
   */
  @Cron(CronExpression.EVERY_WEEK)
  async resetWeeklyLeaderboards(): Promise<void> {
    try {
      // For each weekly leaderboard, store current ranks as previous ranks
      for (const category of Object.values(LeaderboardCategory)) {
        const entries = await this.leaderboardRepository.find({
          where: {
            category,
            timeframe: LeaderboardTimeframe.WEEKLY,
          },
        });

        // Save current rank as previous rank for next calculation
        for (const entry of entries) {
          entry.previousRank = entry.rank;
          await this.leaderboardRepository.save(entry);
        }
      }
    } catch (error) {
      this.logger.error(
        `Weekly leaderboard reset failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Force manual recalculation of all leaderboards
   */
  async forceLeaderboardRecalculation(): Promise<void> {
    return this.updateAllLeaderboards();
  }

  /**
   * Get a user's specific position and score in a leaderboard
   */
  async getUserPosition(
    userId: string,
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
  ): Promise<{ rank: number; points: number }> {
    try {
      const entry = await this.leaderboardRepository.findOne({
        where: {
          userId,
          category,
          timeframe,
        },
      });

      if (entry) {
        return {
          rank: entry.rank,
          points: entry.score,
        };
      }

      // If user not found in this leaderboard, return 0
      return {
        rank: 0,
        points: 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get position for user ${userId} in ${category}/${timeframe}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
