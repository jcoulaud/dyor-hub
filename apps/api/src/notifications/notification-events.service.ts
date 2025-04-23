import { NotificationEventType, NotificationType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../entities';
import { sanitizeHtml } from '../utils/utils';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  private async createAndEmitNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
    relatedMetadata?: Record<string, any> | null,
  ) {
    try {
      await this.notificationsService.createNotification(
        userId,
        type,
        message,
        relatedEntityId,
        relatedEntityType,
        relatedMetadata,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ${type} notification event for user ${userId}: ${error.message}`,
      );
    }
  }

  @OnEvent(NotificationEventType.STREAK_AT_RISK)
  async handleStreakAtRisk(payload: { userId: string; currentStreak: number }) {
    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.STREAK_AT_RISK,
      `Your ${payload.currentStreak} day streak is about to expire in 2 hours! Log in now to keep it going.`,
    );
  }

  @OnEvent(NotificationEventType.STREAK_BROKEN)
  async handleStreakBroken(payload: {
    userId: string;
    previousStreak: number;
  }) {
    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.STREAK_BROKEN,
      `Your ${payload.previousStreak} day streak has been reset. Start a new streak today!`,
    );
  }

  @OnEvent(NotificationEventType.STREAK_MILESTONE)
  async handleStreakMilestone(payload: {
    userId: string;
    currentStreak: number;
  }) {
    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.STREAK_ACHIEVED,
      `Congratulations! You've reached a ${payload.currentStreak} day streak!`,
    );
  }

  @OnEvent(NotificationEventType.BADGE_EARNED)
  async handleBadgeEarned(payload: {
    userId: string;
    badgeId: string;
    badgeName: string;
  }) {
    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.BADGE_EARNED,
      `You've earned the "${payload.badgeName}" badge!`,
      payload.badgeId,
      'badge',
    );
  }

  @OnEvent(NotificationEventType.REPUTATION_MILESTONE)
  async handleReputationMilestone(payload: {
    userId: string;
    reputation: number;
  }) {
    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.REPUTATION_MILESTONE,
      `Congratulations! Your reputation has reached ${payload.reputation} points.`,
    );
  }

  @OnEvent(NotificationEventType.COMMENT_REPLY)
  async handleCommentReply(payload: {
    userId: string;
    commentId: string;
    replyAuthor: string;
    commentText: string;
  }) {
    let tokenMintAddress: string | null = null;
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        select: ['tokenMintAddress'],
      });
      tokenMintAddress = comment?.tokenMintAddress;
    } catch (e) {
      this.logger.error(
        `Failed to get token address for comment ${payload.commentId} on reply event`,
      );
    }

    const plainCommentText = sanitizeHtml(payload.commentText);
    const truncatedText =
      plainCommentText.substring(0, 100) +
      (plainCommentText.length > 100 ? '...' : '');

    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.COMMENT_REPLY,
      `${payload.replyAuthor} replied to your comment: "${truncatedText}"`,
      payload.commentId,
      'comment',
      tokenMintAddress ? { tokenMintAddress } : null,
    );
  }

  @OnEvent(NotificationEventType.COMMENT_UPVOTED)
  async handleCommentUpvoted(payload: {
    userId: string;
    commentId: string;
    voterName: string;
  }) {
    let tokenMintAddress: string | null = null;
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        select: ['tokenMintAddress'],
      });
      tokenMintAddress = comment?.tokenMintAddress;
    } catch (e) {
      this.logger.error(
        `Failed to get token address for comment ${payload.commentId} on upvote event`,
      );
    }

    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.UPVOTE_RECEIVED,
      `${payload.voterName} upvoted your comment`,
      payload.commentId,
      'comment',
      tokenMintAddress ? { tokenMintAddress } : null,
    );
  }

  @OnEvent(NotificationEventType.LEADERBOARD_POSITION_CHANGE)
  async handleLeaderboardPositionChange(payload: {
    userId: string;
    newPosition: number;
    previousPosition: number;
    category?: string;
    timeframe?: string;
  }) {
    let leaderboardName = 'leaderboard';

    if (payload.timeframe) {
      const timeframeDisplay =
        {
          weekly: 'Weekly',
          monthly: 'Monthly',
          all_time: 'All-Time',
        }[payload.timeframe] || payload.timeframe;

      leaderboardName = `${timeframeDisplay} ${leaderboardName}`;
    }

    if (payload.category) {
      const categoryDisplay =
        {
          reputation: 'Reputation',
          comments: 'Comments',
          posts: 'Posts',
          upvotes_given: 'Upvotes Given',
          upvotes_received: 'Upvotes Received',
          tokenCalls: 'Token Calls',
        }[payload.category] || payload.category;

      leaderboardName = `${categoryDisplay} ${leaderboardName}`;
    }

    const message =
      payload.newPosition < payload.previousPosition
        ? `You've moved up to position #${payload.newPosition} on the ${leaderboardName}!`
        : `Your position on the ${leaderboardName} has changed to #${payload.newPosition}.`;

    const metadata: Record<string, any> = {};
    if (payload.category) {
      metadata.category = payload.category;
    }
    if (payload.timeframe) {
      metadata.timeframe = payload.timeframe;
    }

    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.LEADERBOARD_CHANGE,
      message,
      undefined,
      undefined,
      Object.keys(metadata).length > 0 ? metadata : null,
    );
  }

  @OnEvent(NotificationEventType.FOLLOWED_USER_PREDICTION)
  async handleFollowedUserPrediction(payload: {
    followerId: string;
    followedUserId: string;
    followedUsername: string;
    predictionId: string;
    tokenSymbol: string;
    tokenMintAddress: string;
  }) {
    const safeFollowedUsername = sanitizeHtml(payload.followedUsername);
    const safeTokenSymbol = sanitizeHtml(payload.tokenSymbol);
    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_PREDICTION,
      `${safeFollowedUsername} made a prediction for $${safeTokenSymbol}`,
      payload.predictionId,
      'prediction',
      {
        followedUserId: payload.followedUserId,
        followedUsername: safeFollowedUsername,
        tokenMintAddress: payload.tokenMintAddress,
        tokenSymbol: safeTokenSymbol,
      },
    );
  }

  @OnEvent(NotificationEventType.FOLLOWED_USER_COMMENT)
  async handleFollowedUserComment(payload: {
    followerId: string;
    authorId: string;
    authorUsername: string;
    commentId: string;
    commentPreview: string;
    tokenMintAddress: string;
  }) {
    const safeAuthorUsername = sanitizeHtml(payload.authorUsername);
    const safeCommentPreview = sanitizeHtml(payload.commentPreview);
    const truncatedPreview =
      safeCommentPreview.length > 100
        ? safeCommentPreview.substring(0, 97) + '...'
        : safeCommentPreview;
    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_COMMENT,
      `${safeAuthorUsername} posted a comment: "${truncatedPreview}"`,
      payload.commentId,
      'comment',
      {
        authorId: payload.authorId,
        authorUsername: safeAuthorUsername,
        tokenMintAddress: payload.tokenMintAddress,
      },
    );
  }

  @OnEvent(NotificationEventType.FOLLOWED_USER_VOTE)
  async handleFollowedUserVote(payload: {
    followerId: string;
    voterId: string;
    voterUsername: string;
    authorId: string;
    commentId: string;
    tokenMintAddress: string;
  }) {
    const safeVoterUsername = sanitizeHtml(payload.voterUsername);
    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_VOTE,
      `${safeVoterUsername} upvoted a comment by a user you follow.`,
      payload.commentId,
      'comment',
      {
        voterId: payload.voterId,
        voterUsername: safeVoterUsername,
        authorId: payload.authorId,
        tokenMintAddress: payload.tokenMintAddress,
      },
    );
  }
}
