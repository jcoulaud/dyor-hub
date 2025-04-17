import {
  BadgeRequirement,
  LeaderboardCategory,
  LeaderboardTimeframe,
  NotificationEventType,
  TokenCallStatus,
} from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import {
  ActivityType,
  BadgeCategory,
  BadgeEntity,
  CommentEntity,
  TokenCallEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserStreakEntity,
  UserTokenCallStreakEntity,
} from '../../entities';
import { LeaderboardService } from './leaderboard.service';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);
  // Rate limiting cache to track when users were last checked
  private userCheckCache = new Map<
    string,
    { lastCheck: Date; inProgress: boolean }
  >();
  // Rate limit duration in milliseconds (default: 1 minute)
  private readonly rateLimitDuration = 1 * 60 * 1000;

  constructor(
    @InjectRepository(BadgeEntity)
    private readonly badgeRepository: Repository<BadgeEntity>,
    @InjectRepository(UserBadgeEntity)
    private readonly userBadgeRepository: Repository<UserBadgeEntity>,
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(UserStreakEntity)
    private readonly userStreakRepository: Repository<UserStreakEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    @InjectRepository(UserTokenCallStreakEntity)
    private readonly userTokenCallStreakRepository: Repository<UserTokenCallStreakEntity>,
    private readonly leaderboardService: LeaderboardService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check if the user's badge check is rate limited
   * @param userId The user ID to check
   * @returns true if rate limited, false if allowed to proceed
   */
  private isRateLimited(userId: string): boolean {
    const userCache = this.userCheckCache.get(userId);

    if (!userCache) {
      return false;
    }

    // If there's an ongoing check, rate limit
    if (userCache.inProgress) {
      return true;
    }

    const now = new Date();
    const timeSinceLastCheck = now.getTime() - userCache.lastCheck.getTime();

    return timeSinceLastCheck < this.rateLimitDuration;
  }

  /**
   * Mark a user as currently being checked
   * @param userId The user ID
   */
  private markCheckInProgress(userId: string): void {
    this.userCheckCache.set(userId, {
      lastCheck: new Date(),
      inProgress: true,
    });
  }

  /**
   * Mark a user's check as complete
   * @param userId The user ID
   */
  private markCheckComplete(userId: string): void {
    const userCache = this.userCheckCache.get(userId);
    if (userCache) {
      userCache.inProgress = false;
    } else {
      this.userCheckCache.set(userId, {
        lastCheck: new Date(),
        inProgress: false,
      });
    }
  }

  /**
   * Checks ALL potential badges for a user, EXCLUDING weekly specific ones.
   * Called by the periodic scheduler.
   */
  async checkAllUserBadges(userId: string): Promise<UserBadgeEntity[]> {
    try {
      if (this.isRateLimited(userId)) {
        this.logger.log(
          `Full badge check for user ${userId} skipped due to rate limiting`,
        );
        return [];
      }
      this.markCheckInProgress(userId);

      const badges = await this.badgeRepository.find({
        where: {
          isActive: true,
          // Exclude weekly badges from this frequent check
        },
      });

      const badgesToCheck = badges.filter(
        (b) => b.requirement !== BadgeRequirement.TOP_PERCENT_WEEKLY,
      );

      const awardedBadges = await this.processBadgeEligibility(
        userId,
        badgesToCheck,
      );

      this.markCheckComplete(userId);
      return awardedBadges;
    } catch (error) {
      this.logger.error(
        `Failed to check all badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      this.markCheckComplete(userId);
      throw error;
    }
  }

  /**
   * Checks badges related to specific activity counts (posts, comments, votes cast).
   */
  async checkActivityCountBadges(
    userId: string,
    activityType: ActivityType,
  ): Promise<UserBadgeEntity[]> {
    const relevantRequirements = {
      [ActivityType.POST]: [BadgeRequirement.POSTS_COUNT],
      [ActivityType.COMMENT]: [BadgeRequirement.COMMENTS_COUNT],
      [ActivityType.UPVOTE]: [BadgeRequirement.VOTES_CAST_COUNT],
      // Add other activity types if they have count badges
    };

    const requirementsToCheck = relevantRequirements[activityType];
    if (!requirementsToCheck || requirementsToCheck.length === 0) {
      return [];
    }

    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });

      return this.processBadgeEligibility(userId, badgesToCheck);
    } catch (error) {
      this.logger.error(
        `Failed to check ${activityType} count badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Don't throw, allow originating action to succeed
      return [];
    }
  }

  /**
   * Checks badges related to streaks (current, max).
   */
  async checkStreakBadges(userId: string): Promise<UserBadgeEntity[]> {
    const requirementsToCheck = [
      BadgeRequirement.CURRENT_STREAK,
      BadgeRequirement.MAX_STREAK,
    ];
    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });
      return this.processBadgeEligibility(userId, badgesToCheck);
    } catch (error) {
      this.logger.error(
        `Failed to check streak badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Checks badges related to receiving interactions (upvotes, comments).
   */
  async checkReceivedInteractionBadges(
    userId: string,
  ): Promise<UserBadgeEntity[]> {
    const requirementsToCheck = [
      BadgeRequirement.UPVOTES_RECEIVED_COUNT,
      BadgeRequirement.COMMENTS_RECEIVED_COUNT,
    ];
    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });
      return this.processBadgeEligibility(userId, badgesToCheck);
    } catch (error) {
      this.logger.error(
        `Failed to check received interaction badges for user ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Checks badges related to the quality/reception of a specific comment (e.g., min upvotes).
   */
  async checkCommentQualityBadges(
    userId: string, // Owner of the comment
    commentId: string,
  ): Promise<UserBadgeEntity[]> {
    const requirementsToCheck = [BadgeRequirement.MAX_COMMENT_UPVOTES];
    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });
      // Pass commentId context if necessary for eligibility check
      return this.processBadgeEligibility(userId, badgesToCheck, { commentId });
    } catch (error) {
      this.logger.error(
        `Failed to check comment quality badges for user ${userId}, comment ${commentId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Checks badges related to the quality/reception of a specific post (e.g., min upvotes).
   */
  async checkPostQualityBadges(
    userId: string, // Owner of the post
    postId: string, // ID of the top-level comment representing the post
  ): Promise<UserBadgeEntity[]> {
    const requirementsToCheck = [BadgeRequirement.MAX_POST_UPVOTES];
    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });
      // Pass postId if needed later
      return this.processBadgeEligibility(userId, badgesToCheck);
    } catch (error) {
      this.logger.error(
        `Failed to check post quality badges for user ${userId}, post ${postId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Checks badges related to a specific successful token call event.
   */
  async checkTokenCallSuccessBadges(
    userId: string,
    call: TokenCallEntity,
  ): Promise<UserBadgeEntity[]> {
    if (!call || !call.id) {
      this.logger.error(
        `Invalid token call object provided for user ${userId}: ${JSON.stringify(call)}`,
      );
      return [];
    }

    const requirementsToCheck = [
      BadgeRequirement.FIRST_SUCCESSFUL_TOKEN_CALL,
      BadgeRequirement.TOKEN_CALL_MOONSHOT_X,
      BadgeRequirement.TOKEN_CALL_EARLY_BIRD_RATIO,
    ];

    try {
      const badgesToCheck = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: In(requirementsToCheck),
        },
      });

      return this.processBadgeEligibility(userId, badgesToCheck, { call });
    } catch (error) {
      this.logger.error(
        `Failed to check token call success badges for user ${userId}, call ${call.id}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Processes eligibility for a list of badges for a given user.
   * Optional context can be passed for specific checks.
   */
  private async processBadgeEligibility(
    userId: string,
    badges: BadgeEntity[],
    context?: { commentId?: string; call?: TokenCallEntity },
  ): Promise<UserBadgeEntity[]> {
    if (badges.length === 0) {
      return [];
    }

    // Get badges the user already has to avoid re-checking/re-awarding
    const userBadges = await this.userBadgeRepository.find({
      where: { userId, badgeId: In(badges.map((b) => b.id)) },
      select: ['badgeId'],
    });
    const userBadgeIds = userBadges.map((ub) => ub.badgeId);

    // Filter out badges the user already possesses
    const badgesToReallyCheck = badges.filter(
      (badge) => !userBadgeIds.includes(badge.id),
    );

    if (badgesToReallyCheck.length === 0) {
      return [];
    }

    const newlyAwardedBadges: UserBadgeEntity[] = [];

    // Check each remaining badge requirement
    for (const badge of badgesToReallyCheck) {
      // Pass the context flag to the eligibility checker
      const isEligible = await this.checkSingleBadgeEligibility(
        userId,
        badge,
        context,
      );

      if (isEligible) {
        // Award the badge
        const userBadge = this.userBadgeRepository.create({
          userId,
          badgeId: badge.id,
          earnedAt: new Date(),
        });

        try {
          await this.userBadgeRepository.save(userBadge);
          newlyAwardedBadges.push(userBadge);

          // Emit event for notification service
          this.eventEmitter.emit(NotificationEventType.BADGE_EARNED, {
            userId: userId,
            badgeId: badge.id,
            badgeName: badge.name,
          });
        } catch (saveError) {
          // Handle potential race condition if badge was awarded by another process
          // between the check and the save (e.g., unique constraint violation)
          if (saveError.code === '23505') {
            // Check for typical unique constraint error code
            this.logger.warn(
              `Attempted to award badge ${badge.name} to user ${userId}, but it was already awarded (likely race condition).`,
            );
          } else {
            this.logger.error(
              `Failed to save awarded badge ${badge.name} for user ${userId}: ${saveError.message}`,
              saveError.stack,
            );
          }
        }
      }
    }
    return newlyAwardedBadges;
  }

  // Force check badges for a user regardless of rate limiting
  async forceCheckAndAwardBadges(userId: string): Promise<UserBadgeEntity[]> {
    this.userCheckCache.delete(userId);
    return this.checkAllUserBadges(userId);
  }

  private async checkSingleBadgeEligibility(
    userId: string,
    badge: BadgeEntity,
    context?: { commentId?: string; call?: TokenCallEntity },
  ): Promise<boolean> {
    const isWeeklyCheck = context === undefined;
    const isCommentCheck = context?.commentId !== undefined;
    const isTokenCallCheck = context?.call !== undefined;

    if (
      badge.requirement === BadgeRequirement.TOP_PERCENT_WEEKLY &&
      !isWeeklyCheck
    ) {
      return false;
    }
    if (
      isCommentCheck &&
      badge.requirement !== BadgeRequirement.MAX_COMMENT_UPVOTES
    ) {
      return false;
    }
    const tokenCallRequirements = [
      BadgeRequirement.FIRST_SUCCESSFUL_TOKEN_CALL,
      BadgeRequirement.TOKEN_CALL_MOONSHOT_X,
      BadgeRequirement.TOKEN_CALL_EARLY_BIRD_RATIO,
    ];
    if (
      isTokenCallCheck &&
      !tokenCallRequirements.includes(badge.requirement as BadgeRequirement)
    ) {
      return false;
    }
    // Prevent weekly/comment/call context mixups for other badge types
    if (
      !isWeeklyCheck &&
      !isCommentCheck &&
      !isTokenCallCheck &&
      badge.requirement === BadgeRequirement.TOP_PERCENT_WEEKLY
    ) {
      return false; // Should be covered above, but belts and braces
    }

    try {
      switch (badge.requirement) {
        case BadgeRequirement.CURRENT_STREAK:
          return this.checkStreakRequirement(userId, badge.thresholdValue);
        case BadgeRequirement.MAX_STREAK:
          return this.checkMaxStreakRequirement(userId, badge.thresholdValue);
        case BadgeRequirement.POSTS_COUNT:
          return this.checkActivityCount(
            userId,
            ActivityType.POST,
            badge.thresholdValue,
          );
        case BadgeRequirement.COMMENTS_COUNT:
          return this.checkActivityCount(
            userId,
            ActivityType.COMMENT,
            badge.thresholdValue,
          );
        case BadgeRequirement.VOTES_CAST_COUNT:
          return this.checkActivityCount(
            userId,
            ActivityType.UPVOTE,
            badge.thresholdValue,
          );
        case BadgeRequirement.UPVOTES_RECEIVED_COUNT:
          return this.checkTotalUpvotesReceived(userId, badge.thresholdValue);
        case BadgeRequirement.COMMENTS_RECEIVED_COUNT:
          return this.checkTotalCommentsReceived(userId, badge.thresholdValue);
        case BadgeRequirement.MAX_COMMENT_UPVOTES:
          return this.checkCommentMinUpvotes(
            context?.commentId,
            userId,
            badge.thresholdValue,
          );
        case BadgeRequirement.MAX_POST_UPVOTES:
          return this.checkPostMinUpvotes(userId, badge.thresholdValue);
        case BadgeRequirement.TOP_PERCENT_WEEKLY:
          return this.checkLeaderboardPercentile(
            userId,
            badge.thresholdValue,
            LeaderboardCategory.REPUTATION,
            LeaderboardTimeframe.WEEKLY,
          );
        case BadgeRequirement.FIRST_SUCCESSFUL_TOKEN_CALL:
          return this.checkFirstSuccessfulCall(userId);
        case BadgeRequirement.TOKEN_CALL_MOONSHOT_X:
          // Ensure context and context.call are available before checking
          return (
            isTokenCallCheck &&
            this.checkMoonshotCall(context.call, badge.thresholdValue)
          );
        case BadgeRequirement.TOKEN_CALL_EARLY_BIRD_RATIO:
          // Ensure context and context.call are available before checking
          return (
            isTokenCallCheck &&
            this.checkEarlyBirdCall(context.call, badge.thresholdValue)
          );
        case BadgeRequirement.TOKEN_CALL_SUCCESS_STREAK:
          // Streaks are calculated based on user history, not a single call context
          return this.checkTokenCallStreak(userId, badge.thresholdValue);
        case BadgeRequirement.SUCCESSFUL_TOKEN_CALL_COUNT:
          return this.checkSuccessfulCallCount(userId, badge.thresholdValue);
        case BadgeRequirement.VERIFIED_TOKEN_CALL_COUNT:
          return this.checkVerifiedCallCount(userId, badge.thresholdValue);
        case BadgeRequirement.TOKEN_CALL_ACCURACY_RATE:
          return this.checkAccuracyRate(userId, badge.thresholdValue);
        default:
          this.logger.warn(
            `Unhandled badge requirement: ${badge.requirement} for badge ${badge.name}`,
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

  private async checkMaxStreakRequirement(
    userId: string,
    requiredStreak: number,
  ): Promise<boolean> {
    const userStreak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!userStreak) return false;
    return userStreak.longestStreak >= requiredStreak;
  }

  private async checkActivityCount(
    userId: string,
    activityType: ActivityType,
    threshold: number,
  ): Promise<boolean> {
    try {
      const count = await this.userActivityRepository.count({
        where: {
          userId,
          activityType,
        },
      });
      return count >= threshold;
    } catch (error) {
      this.logger.error(
        `Error checking ${activityType} count for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  private async checkTotalUpvotesReceived(
    userId: string,
    requiredCount: number,
  ): Promise<boolean> {
    try {
      const result = await this.commentRepository
        .createQueryBuilder('comment')
        .leftJoin('comment.votes', 'votes', 'votes.type = :voteType', {
          voteType: 'upvote',
        })
        .where('comment.userId = :userId', { userId })
        .select('COUNT(votes.id)', 'upvoteCount')
        .getRawOne();

      const count =
        result && result.upvoteCount ? parseInt(result.upvoteCount, 10) : 0;
      return count >= requiredCount;
    } catch (error) {
      this.logger.error(
        `Error checking total upvotes received for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  private async checkTotalCommentsReceived(
    userId: string,
    requiredCount: number,
  ): Promise<boolean> {
    try {
      // Use subquery to count replies to user's comments
      const result = await this.commentRepository
        .createQueryBuilder('reply') // Alias the reply comment
        .select('COUNT(reply.id)', 'replyCount')
        // Check where the parentId matches an ID from the subquery
        .where(
          'reply.parentId IN (SELECT c.id FROM comments c WHERE c.user_id = :userId)',
          { userId },
        )
        .getRawOne();

      const count =
        result && result.replyCount ? parseInt(result.replyCount, 10) : 0;

      return count >= requiredCount;
    } catch (error) {
      this.logger.error(
        `Error checking comments received count for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  private async checkCommentMinUpvotes(
    commentId: string,
    userId: string,
    minUpvotes: number,
  ): Promise<boolean> {
    try {
      // Find the specific comment by its ID
      const comment = await this.commentRepository.findOne({
        where: {
          id: commentId,
        },
        select: ['id', 'upvotes'], // Select upvotes count
      });

      if (!comment) {
        this.logger.warn(
          `Comment ${commentId} not found for MAX_COMMENT_UPVOTES check.`,
        );
        return false;
      }

      // Check if the comment's upvotes meet the threshold
      return comment.upvotes >= minUpvotes;
    } catch (error) {
      this.logger.error(
        `Error checking min upvotes for comment ${commentId} (User ${userId}): ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Checks if the user has at least one post (comment with no parent) with a minimum number of upvotes.
   */
  private async checkPostMinUpvotes(
    userId: string,
    minUpvotes: number,
  ): Promise<boolean> {
    try {
      // Query for a comment by the user with parentId = NULL and enough upvotes
      const postComment = await this.commentRepository.findOne({
        where: {
          userId: userId,
          parentId: IsNull(), // Check for top-level comments (posts)
          upvotes: MoreThanOrEqual(minUpvotes),
        },
        select: ['id'], // Only need to know if one exists
      });
      return !!postComment; // Return true if a matching post comment was found
    } catch (error) {
      this.logger.error(
        `Error checking post min upvotes for user ${userId}: ${error.message}`,
      );
      return false;
    }
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

  async getAvailableBadges(userId: string): Promise<
    (BadgeEntity & {
      isAchieved: boolean;
      progress?: number;
      currentValue: number;
    })[]
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

      // Create array of badges with achievement status
      const badgesWithStatus = badges.map((badge) => ({
        ...badge,
        isAchieved: earnedBadgeIds.includes(badge.id),
        currentValue: 0,
        progress: 0, // Initialize progress
      })) as Array<
        BadgeEntity & {
          isAchieved: boolean;
          progress: number;
          currentValue: number;
        }
      >;

      // Calculate progress for badges
      for (const badge of badgesWithStatus) {
        const { progress, currentValue } = await this.calculateBadgeProgress(
          userId,
          badge,
        );
        badge.progress = progress;
        badge.currentValue = currentValue;
      }

      return badgesWithStatus;
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
  ): Promise<{ progress: number; currentValue: number }> {
    try {
      let currentValue = 0;
      const target = badge.thresholdValue;

      switch (badge.requirement) {
        case BadgeRequirement.CURRENT_STREAK: {
          const query = `
            SELECT current_streak 
            FROM user_streaks 
            WHERE user_id = $1
          `;
          const result = await this.userActivityRepository.query(query, [
            userId,
          ]);
          currentValue =
            result.length > 0 ? parseInt(result[0].current_streak, 10) : 0;
          break;
        }
        case BadgeRequirement.MAX_STREAK: {
          const query = `
            SELECT longest_streak 
            FROM user_streaks 
            WHERE user_id = $1
          `;
          const result = await this.userActivityRepository.query(query, [
            userId,
          ]);
          currentValue =
            result.length > 0 ? parseInt(result[0].longest_streak, 10) : 0;
          break;
        }
        case BadgeRequirement.POSTS_COUNT:
          currentValue = await this.userActivityRepository.count({
            where: { userId, activityType: ActivityType.POST },
          });
          break;
        case BadgeRequirement.COMMENTS_COUNT:
          currentValue = await this.commentRepository.count({
            where: { userId },
          });
          break;
        case BadgeRequirement.VOTES_CAST_COUNT:
          currentValue = await this.userActivityRepository.count({
            where: { userId, activityType: ActivityType.UPVOTE },
          });
          break;
        case BadgeRequirement.UPVOTES_RECEIVED_COUNT: {
          const result = await this.commentRepository
            .createQueryBuilder('comment')
            .leftJoin('comment.votes', 'votes', 'votes.type = :voteType', {
              voteType: 'upvote',
            })
            .where('comment.userId = :userId', { userId })
            .select('COUNT(votes.id)', 'upvoteCount')
            .getRawOne();

          currentValue =
            result && result.upvoteCount ? parseInt(result.upvoteCount, 10) : 0;
          break;
        }
        case BadgeRequirement.MAX_POST_UPVOTES: {
          // Get max upvotes on any top-level comment (post)
          const result = await this.commentRepository
            .createQueryBuilder('comment')
            .where('comment.userId = :userId', { userId })
            .andWhere('comment.parentId IS NULL') // Only top-level comments
            .select('MAX(comment.upvotes_count)', 'maxUpvotes')
            .getRawOne();

          currentValue =
            result && result.maxUpvotes ? parseInt(result.maxUpvotes, 10) : 0;
          break;
        }
        case BadgeRequirement.MAX_COMMENT_UPVOTES: {
          // Get max upvotes on any comment
          const result = await this.commentRepository
            .createQueryBuilder('comment')
            .where('comment.userId = :userId', { userId })
            .select('MAX(comment.upvotes_count)', 'maxUpvotes')
            .getRawOne();

          currentValue =
            result && result.maxUpvotes ? parseInt(result.maxUpvotes, 10) : 0;
          break;
        }
        case BadgeRequirement.TOP_PERCENT_WEEKLY: {
          // Calculate progress towards top X% of Weekly Reputation
          try {
            const userPos = await this.leaderboardService.getUserPosition(
              userId,
              LeaderboardCategory.REPUTATION,
              LeaderboardTimeframe.WEEKLY,
            );
            const meta = await this.leaderboardService.getLeaderboard(
              LeaderboardCategory.REPUTATION,
              LeaderboardTimeframe.WEEKLY,
              1,
              1,
            );
            const total = meta.meta?.total;

            if (!userPos || userPos.rank <= 0 || !total || total === 0) {
              return { progress: 0, currentValue: 0 };
            }

            const currentPercentile = (userPos.rank / total) * 100;
            const targetPercentile = badge.thresholdValue;

            // Progress: 100% if at or better than target.
            const progress = currentPercentile <= targetPercentile ? 100 : 0;

            return {
              progress: progress,
              currentValue: Math.round(currentPercentile),
            };
          } catch {
            return { progress: 0, currentValue: 0 };
          }
        }
        default:
          return { progress: 0, currentValue: 0 };
      }

      // Calculate percentage (0-100)
      const progress = Math.min(100, Math.round((currentValue / target) * 100));
      return { progress, currentValue };
    } catch (error) {
      this.logger.error(
        `Error calculating badge progress: ${error.message}`,
        error.stack,
      );
      return { progress: 0, currentValue: 0 };
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

  /**
   * Checks if a user ranks within the top X percentile of a specific leaderboard.
   * @param userId User ID
   * @param percentileThreshold The target percentile (e.g., 5 for top 5%)
   * @param category Leaderboard category
   * @param timeframe Leaderboard timeframe
   * @returns Promise<boolean> True if the user is within the percentile threshold.
   */
  private async checkLeaderboardPercentile(
    userId: string,
    percentileThreshold: number,
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
  ): Promise<boolean> {
    if (percentileThreshold <= 0 || percentileThreshold > 100) {
      this.logger.warn(
        `Invalid percentile threshold ${percentileThreshold} for leaderboard check.`,
      );
      return false;
    }
    try {
      // 1. Get user's rank
      const userPosition = await this.leaderboardService.getUserPosition(
        userId,
        category,
        timeframe,
      );

      // User not ranked or rank is 0, cannot be in top percentile
      if (!userPosition || userPosition.rank <= 0) {
        // this.logger.debug(`User ${userId} not ranked in ${category}/${timeframe}.`);
        return false;
      }
      const userRank = userPosition.rank;

      // 2. Get total ranked users
      const leaderboardMeta = await this.leaderboardService.getLeaderboard(
        category,
        timeframe,
        1, // page 1
        1, // pageSize 1 (only need meta)
      );

      const totalRanked = leaderboardMeta.meta?.total;
      if (totalRanked === undefined || totalRanked === 0) {
        this.logger.warn(
          `Total ranked users is 0 for ${category}/${timeframe}.`,
        );
        return false; // Avoid division by zero
      }

      // 3. Calculate percentile
      const percentile = (userRank / totalRanked) * 100;

      // 4. Check against threshold
      const isEligible = percentile <= percentileThreshold;

      this.logger.debug(
        `Leaderboard Check: User ${userId}, Rank ${userRank}/${totalRanked} (${percentile.toFixed(2)}%) in ${category}/${timeframe}. Target <= ${percentileThreshold}%. Eligible: ${isEligible}`,
      );

      return isEligible;
    } catch (error) {
      this.logger.error(
        `Error checking leaderboard percentile for User ${userId} (${category}/${timeframe}): ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Checks badges related ONLY to weekly percentile requirements for a user.
   * Intended to be called by the weekly scheduler.
   */
  async checkWeeklyPercentBadges(userId: string): Promise<UserBadgeEntity[]> {
    try {
      this.logger.debug(`Checking weekly percent badges for user ${userId}`);
      const weeklyPercentBadges = await this.badgeRepository.find({
        where: {
          isActive: true,
          requirement: BadgeRequirement.TOP_PERCENT_WEEKLY,
        },
      });

      if (weeklyPercentBadges.length === 0) {
        return [];
      }

      return this.processBadgeEligibility(userId, weeklyPercentBadges);
    } catch (error) {
      this.logger.error(
        `Failed to check weekly percent badges for user ${userId}: ${error.message}`,
      );
      return [];
    }
  }

  private async checkFirstSuccessfulCall(userId: string): Promise<boolean> {
    // Count successful calls BEFORE the current one (which triggered this check)
    const count = await this.tokenCallRepository.count({
      where: {
        userId: userId,
        status: TokenCallStatus.VERIFIED_SUCCESS,
      },
    });
    // If the count is exactly 1, it means the current call is the first successful one
    return count === 1;
  }

  private checkMoonshotCall(
    call: TokenCallEntity,
    requiredMultiplier: number,
  ): boolean {
    // Safely check if properties exist and have valid values
    if (
      !call ||
      typeof call.referencePrice === 'undefined' ||
      call.referencePrice === null ||
      typeof call.targetPrice === 'undefined' ||
      call.targetPrice === null ||
      call.referencePrice <= 0
    ) {
      this.logger.error(
        `Invalid call data for Moonshot check: refPrice=${call?.referencePrice}, targetPrice=${call?.targetPrice}`,
      );
      return false;
    }

    const multiplier = call.targetPrice / call.referencePrice;
    return multiplier >= requiredMultiplier;
  }

  private checkEarlyBirdCall(call: TokenCallEntity, maxRatio: number): boolean {
    // Safely check if call and timeToHitRatio exist and are valid
    if (
      !call ||
      typeof call.timeToHitRatio === 'undefined' ||
      call.timeToHitRatio === null
    ) {
      this.logger.error(
        `Invalid call data for Early Bird check: timeToHitRatio=${call?.timeToHitRatio}`,
      );
      return false;
    }

    return call.timeToHitRatio < maxRatio;
  }

  private async checkTokenCallStreak(
    userId: string,
    requiredStreak: number,
  ): Promise<boolean> {
    const streak = await this.userTokenCallStreakRepository.findOne({
      where: { userId },
    });
    // Check against the longest streak achieved, as current might reset
    if (!streak) return false;
    return streak.longestSuccessStreak >= requiredStreak;
  }

  /**
   * Checks if a user has made at least N successful token calls.
   */
  private async checkSuccessfulCallCount(
    userId: string,
    threshold: number,
  ): Promise<boolean> {
    try {
      const count = await this.tokenCallRepository.count({
        where: {
          userId: userId,
          status: TokenCallStatus.VERIFIED_SUCCESS,
        },
      });
      return count >= threshold;
    } catch (error) {
      this.logger.error(
        `Error checking successful token call count for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Checks if a user has made at least N *verified* token calls (success or fail).
   */
  private async checkVerifiedCallCount(
    userId: string,
    threshold: number,
  ): Promise<boolean> {
    try {
      const count = await this.tokenCallRepository.count({
        where: {
          userId: userId,
          status: In([
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ]),
        },
      });
      return count >= threshold;
    } catch (error) {
      this.logger.error(
        `Error checking verified token call count for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Checks if a user's token call accuracy rate meets a threshold.
   */
  private async checkAccuracyRate(
    userId: string,
    requiredAccuracyPercent: number,
  ): Promise<boolean> {
    try {
      const counts = await this.tokenCallRepository
        .createQueryBuilder('call')
        .select('COUNT(call.id)', 'totalVerified')
        .addSelect(
          `SUM(CASE WHEN call.status = '${TokenCallStatus.VERIFIED_SUCCESS}' THEN 1 ELSE 0 END)`,
          'totalSuccess',
        )
        .where('call.userId = :userId', { userId })
        .andWhere('call.status IN (:...statuses)', {
          statuses: [
            TokenCallStatus.VERIFIED_SUCCESS,
            TokenCallStatus.VERIFIED_FAIL,
          ],
        })
        .getRawOne();

      const totalVerified = parseInt(counts?.totalVerified || '0', 10);
      const totalSuccess = parseInt(counts?.totalSuccess || '0', 10);

      if (totalVerified === 0) {
        return false;
      }

      const currentAccuracy = totalSuccess / totalVerified;
      const requiredAccuracy = requiredAccuracyPercent / 100;

      return currentAccuracy >= requiredAccuracy;
    } catch (error) {
      this.logger.error(
        `Error checking token call accuracy rate for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }
}
