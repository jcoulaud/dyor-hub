import { NotificationEventType, NotificationType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { format, parseISO } from 'date-fns';
import numbro from 'numbro';
import { Repository } from 'typeorm';
import { DYORHUB_SYMBOL } from '../common/constants';
import { CommentEntity, TokenCallEntity } from '../entities';
import { sanitizeHtml } from '../utils/utils';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
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
    let tokenSymbol: string | null = null;

    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        relations: ['token'],
      });

      tokenMintAddress = comment?.tokenMintAddress;
      tokenSymbol = comment?.token?.symbol || null;
    } catch (e) {
      this.logger.error(
        `Failed to get token data for comment ${payload.commentId} on reply event: ${e.message}`,
      );
    }

    const plainCommentText = sanitizeHtml(payload.commentText);
    const truncatedText =
      plainCommentText.substring(0, 100) +
      (plainCommentText.length > 100 ? '...' : '');

    const tokenInfo = tokenSymbol ? ` about $${tokenSymbol}` : '';

    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.COMMENT_REPLY,
      `${payload.replyAuthor} replied to your comment${tokenInfo}: "${truncatedText}"`,
      payload.commentId,
      'comment',
      tokenMintAddress ? { tokenMintAddress, tokenSymbol } : null,
    );
  }

  @OnEvent(NotificationEventType.COMMENT_UPVOTED)
  async handleCommentUpvoted(payload: {
    userId: string;
    commentId: string;
    voterName: string;
  }) {
    let tokenMintAddress: string | null = null;
    let tokenSymbol: string | null = null;

    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        relations: ['token'],
      });

      tokenMintAddress = comment?.tokenMintAddress;
      tokenSymbol = comment?.token?.symbol || null;
    } catch (e) {
      this.logger.error(
        `Failed to get token data for comment ${payload.commentId} on upvote event: ${e.message}`,
      );
    }

    const tokenInfo = tokenSymbol ? ` about $${tokenSymbol}` : '';

    await this.createAndEmitNotification(
      payload.userId,
      NotificationType.UPVOTE_RECEIVED,
      `${payload.voterName} upvoted your comment${tokenInfo}`,
      payload.commentId,
      'comment',
      tokenMintAddress ? { tokenMintAddress, tokenSymbol } : null,
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
    let message = `${safeFollowedUsername} made a prediction for $${safeTokenSymbol}`;

    try {
      const tokenCall = await this.tokenCallRepository.findOne({
        where: { id: payload.predictionId },
        select: [
          'targetPrice',
          'referencePrice',
          'referenceSupply',
          'targetDate',
        ],
      });

      if (tokenCall) {
        const { targetPrice, referencePrice, referenceSupply, targetDate } =
          tokenCall;

        let percentageIncreaseStr = '';
        if (referencePrice && referencePrice > 0) {
          const percentageIncrease =
            ((targetPrice - referencePrice) / referencePrice) * 100;
          percentageIncreaseStr = `${percentageIncrease >= 0 ? '+' : ''}${percentageIncrease.toFixed(1)}%`;
        } else {
          percentageIncreaseStr = 'N/A';
        }

        const marketCap = targetPrice * (referenceSupply ?? 0);
        const formattedMarketCap = numbro(marketCap).format({
          average: true,
          mantissa: marketCap < 1000000 ? 0 : 2,
          trimMantissa: true,
        });

        const formattedDate = format(
          typeof targetDate === 'string' ? parseISO(targetDate) : targetDate,
          'MMM d, yyyy',
        );

        const formattedPrice = targetPrice.toLocaleString();

        message = `${safeFollowedUsername} made a prediction for $${safeTokenSymbol} of ${percentageIncreaseStr} at $${formattedMarketCap} MC ($${formattedPrice} price) for ${formattedDate}`;
      } else {
        this.logger.warn(
          `TokenCall with ID ${payload.predictionId} not found for notification.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch TokenCall details for notification: ${error.message}`,
      );
    }

    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_PREDICTION,
      message,
      payload.predictionId,
      'token_call',
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

    let tokenSymbol: string | null = null;
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        relations: ['token'],
      });

      tokenSymbol = comment?.token?.symbol || null;
    } catch (e) {
      this.logger.error(
        `Failed to get token data for comment ${payload.commentId} on followed user comment event: ${e.message}`,
      );
    }

    const tokenInfo = tokenSymbol ? ` about $${tokenSymbol}` : '';

    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_COMMENT,
      `${safeAuthorUsername} posted a comment${tokenInfo}: "${truncatedPreview}"`,
      payload.commentId,
      'comment',
      {
        authorId: payload.authorId,
        authorUsername: safeAuthorUsername,
        tokenMintAddress: payload.tokenMintAddress,
        tokenSymbol: tokenSymbol,
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

    let tokenSymbol: string | null = null;
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: payload.commentId },
        relations: ['token'],
      });

      tokenSymbol = comment?.token?.symbol || null;
    } catch (e) {
      this.logger.error(
        `Failed to get token data for comment ${payload.commentId} on followed user vote event: ${e.message}`,
      );
    }

    const tokenInfo = tokenSymbol ? ` about $${tokenSymbol}` : '';

    await this.createAndEmitNotification(
      payload.followerId,
      NotificationType.FOLLOWED_USER_VOTE,
      `${safeVoterUsername} upvoted a comment${tokenInfo}.`,
      payload.commentId,
      'comment',
      {
        voterId: payload.voterId,
        voterUsername: safeVoterUsername,
        authorId: payload.authorId,
        tokenMintAddress: payload.tokenMintAddress,
        tokenSymbol: tokenSymbol,
      },
    );
  }

  @OnEvent(NotificationEventType.TIP_RECEIVED)
  async handleTipReceived(payload: {
    recipientUserId: string;
    senderUserId: string;
    senderDisplayName: string;
    amount: number;
    contentType?: 'comment' | 'profile' | 'call' | null;
    contentId?: string | null;
    tipId: string;
  }) {
    try {
      const displayAmount = payload.amount / Math.pow(10, 6);
      const formattedAmount = numbro(displayAmount).format({
        thousandSeparated: true,
        mantissa: 2,
      });

      const senderName = sanitizeHtml(payload.senderDisplayName);
      let message = `${senderName} sent you ${formattedAmount} ${DYORHUB_SYMBOL}!`;
      let entityType: string | undefined = undefined;
      let entityId: string | undefined = undefined;
      const metadata: Record<string, any> = {
        senderId: payload.senderUserId,
        senderDisplayName: senderName,
        amount: payload.amount,
        tipId: payload.tipId,
      };

      if (payload.contentType && payload.contentId) {
        entityType = payload.contentType;
        entityId = payload.contentId;
        metadata.contentType = payload.contentType;
        metadata.contentId = payload.contentId;
        if (payload.contentType === 'comment') {
          message = `${senderName} tipped ${formattedAmount} ${DYORHUB_SYMBOL} on your comment!`;
          const comment = await this.commentRepository.findOne({
            where: { id: payload.contentId },
            relations: ['token'],
          });
          if (comment?.tokenMintAddress) {
            metadata.tokenMintAddress = comment.tokenMintAddress;
          } else {
            this.logger.warn(
              `Could not find tokenMintAddress for comment ${payload.contentId} when handling tip notification.`,
            );
          }
          if (comment?.token?.symbol)
            metadata.tokenSymbol = comment.token.symbol;
        } else if (payload.contentType === 'call') {
          message = `${senderName} tipped ${formattedAmount} ${DYORHUB_SYMBOL} on your prediction!`;
          const call = await this.tokenCallRepository.findOne({
            where: { id: payload.contentId },
            relations: ['token'],
          });
          if (call?.tokenId) metadata.tokenMintAddress = call.tokenId;
          if (call?.token?.symbol) metadata.tokenSymbol = call.token.symbol;
        } else if (payload.contentType === 'profile') {
          message = `${senderName} sent you a ${formattedAmount} ${DYORHUB_SYMBOL} tip directly!`;
          entityType = 'user';
          entityId = payload.senderUserId;
        }
      }

      await this.createAndEmitNotification(
        payload.recipientUserId,
        NotificationType.TIP_RECEIVED,
        message,
        entityId,
        entityType,
        metadata,
      );
    } catch (error) {
      this.logger.error(
        `Error handling tip received event: ${error.message}`,
        error.stack,
      );
    }
  }
}
