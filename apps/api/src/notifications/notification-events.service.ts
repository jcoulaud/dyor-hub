import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '../entities';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('streak.at_risk')
  async handleStreakAtRisk(payload: { userId: string; currentStreak: number }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.STREAK_AT_RISK,
        `Your ${payload.currentStreak} day streak is at risk! Log in now to keep it going.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create streak at risk notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('streak.broken')
  async handleStreakBroken(payload: {
    userId: string;
    previousStreak: number;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.STREAK_BROKEN,
        `Your ${payload.previousStreak} day streak has been reset. Start a new streak today!`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create streak broken notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('streak.milestone')
  async handleStreakMilestone(payload: {
    userId: string;
    currentStreak: number;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.STREAK_ACHIEVED,
        `Congratulations! You've reached a ${payload.currentStreak} day streak!`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create streak milestone notification: ${error.message}`,
        error.stack,
      );
    }
  }

  // Badge-related notifications
  @OnEvent('badge.earned')
  async handleBadgeEarned(payload: {
    userId: string;
    badgeId: string;
    badgeName: string;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.BADGE_EARNED,
        `You've earned the "${payload.badgeName}" badge!`,
        payload.badgeId,
        'badge',
      );
    } catch (error) {
      this.logger.error(
        `Failed to create badge earned notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('reputation.milestone')
  async handleReputationMilestone(payload: {
    userId: string;
    reputation: number;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.REPUTATION_MILESTONE,
        `Congratulations! Your reputation has reached ${payload.reputation} points.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create reputation milestone notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('comment.reply')
  async handleCommentReply(payload: {
    userId: string;
    commentId: string;
    replyAuthor: string;
    commentText: string;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.COMMENT_REPLY,
        `${payload.replyAuthor} replied to your comment: "${payload.commentText.substring(0, 50)}${payload.commentText.length > 50 ? '...' : ''}"`,
        payload.commentId,
        'comment',
      );
    } catch (error) {
      this.logger.error(
        `Failed to create comment reply notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('comment.upvoted')
  async handleCommentUpvoted(payload: {
    userId: string;
    commentId: string;
    voterName: string;
  }) {
    try {
      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.UPVOTE_RECEIVED,
        `${payload.voterName} upvoted your comment`,
        payload.commentId,
        'comment',
      );
    } catch (error) {
      this.logger.error(
        `Failed to create upvote notification: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('leaderboard.position_change')
  async handleLeaderboardPositionChange(payload: {
    userId: string;
    newPosition: number;
    previousPosition: number;
  }) {
    try {
      const message =
        payload.newPosition < payload.previousPosition
          ? `You've moved up to position #${payload.newPosition} on the leaderboard!`
          : `Your position on the leaderboard has changed to #${payload.newPosition}.`;

      await this.notificationsService.createNotification(
        payload.userId,
        NotificationType.LEADERBOARD_CHANGE,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create leaderboard notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
