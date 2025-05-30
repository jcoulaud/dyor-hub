import { ActivityType, NotificationType } from '@dyor-hub/types';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../../entities';
import { NotificationsService } from '../../notifications/notifications.service';
import { ActivityTrackingService } from './activity-tracking.service';
import { BadgeService } from './badge.service';
import { ReputationService } from './reputation.service';

export enum GamificationEvent {
  COMMENT_CREATED = 'comment.created',
  COMMENT_VOTED = 'comment.voted',
  USER_LOGGED_IN = 'user.logged_in',
  REFERRAL_SUCCESSFUL = 'referral.successful',
}

export interface CommentCreatedEvent {
  userId: string;
  commentId: string;
  parentId: string | null;
}

export interface CommentVotedEvent {
  voterUserId: string;
  commentId: string;
  commentOwnerUserId: string;
  voteType: 'upvote' | 'downvote';
}

export interface UserLoggedInEvent {
  userId: string;
}

export interface ReferralSuccessfulEvent {
  referrerId: string;
  referredUserId: string;
  referralId: string;
}

@Injectable()
export class ActivityHooksService {
  private readonly logger = new Logger(ActivityHooksService.name);

  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
    private readonly badgeService: BadgeService,
    private readonly reputationService: ReputationService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  @OnEvent(GamificationEvent.COMMENT_CREATED)
  async handleCommentCreated(event: CommentCreatedEvent) {
    const isPost = event.parentId === null;
    const activityType = isPost ? ActivityType.POST : ActivityType.COMMENT;
    const entityType = 'comments';

    try {
      await this.activityTrackingService.trackActivity(
        event.userId,
        activityType,
        event.commentId,
        entityType,
      );

      await this.reputationService.awardPointsForActivity(
        event.userId,
        activityType,
      );

      await this.badgeService.checkActivityCountBadges(
        event.userId,
        activityType,
      );

      if (isPost) {
        await this.badgeService.checkPostQualityBadges(
          event.userId,
          event.commentId,
        );
      } else {
        if (event.parentId) {
          try {
            const parentComment = await this.commentRepository.findOne({
              where: { id: event.parentId },
              select: ['userId'],
            });
            if (parentComment && parentComment.userId !== event.userId) {
              await this.badgeService.checkReceivedInteractionBadges(
                parentComment.userId,
              );
            }
          } catch (parentError) {
            this.logger.error(
              `Failed to check parent owner badges for reply to ${event.parentId}: ${parentError.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to track ${activityType} activity: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(GamificationEvent.COMMENT_VOTED)
  async handleCommentVoted(event: CommentVotedEvent) {
    const activityType =
      event.voteType === 'upvote' ? ActivityType.UPVOTE : ActivityType.DOWNVOTE;

    try {
      await this.activityTrackingService.trackActivity(
        event.voterUserId,
        activityType,
        event.commentId,
        'comments',
      );

      await this.reputationService.awardPointsForActivity(
        event.voterUserId,
        activityType,
      );

      await this.badgeService.checkActivityCountBadges(
        event.voterUserId,
        activityType,
      );

      if (event.voteType === 'upvote') {
        await this.badgeService.checkReceivedInteractionBadges(
          event.commentOwnerUserId,
        );

        const comment = await this.commentRepository.findOne({
          where: { id: event.commentId },
          select: ['parentId'],
        });

        if (comment) {
          if (comment.parentId === null) {
            await this.badgeService.checkPostQualityBadges(
              event.commentOwnerUserId,
              event.commentId,
            );
          } else {
            await this.badgeService.checkCommentQualityBadges(
              event.commentOwnerUserId,
              event.commentId,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to track vote activity: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(GamificationEvent.USER_LOGGED_IN)
  async handleUserLoggedIn(event: UserLoggedInEvent) {
    try {
      await this.activityTrackingService.trackActivity(
        event.userId,
        ActivityType.LOGIN,
      );

      await this.reputationService.awardPointsForActivity(
        event.userId,
        ActivityType.LOGIN,
      );

      await this.badgeService.checkStreakBadges(event.userId);
    } catch (error) {
      this.logger.error(
        `Failed to track login activity: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(GamificationEvent.REFERRAL_SUCCESSFUL)
  async handleReferralSuccessful(payload: ReferralSuccessfulEvent) {
    this.logger.log(
      `Handling successful referral: Referrer ${payload.referrerId} referred ${payload.referredUserId}`,
    );
    try {
      await this.reputationService.awardPointsForActivity(
        payload.referrerId,
        ActivityType.REFERRAL_SUCCESS,
      );

      await this.activityTrackingService.trackActivity(
        payload.referrerId,
        ActivityType.REFERRAL_SUCCESS,
        payload.referralId,
        'referrals',
      );

      await this.badgeService.checkReferralCountBadges(payload.referrerId);

      await this.notificationsService.createNotification(
        payload.referrerId,
        NotificationType.REFERRAL_SUCCESS,
        'Your referral was successful! You earned reputation points.',
        payload.referralId,
        'referrals',
        { referredUserId: payload.referredUserId },
      );

      this.logger.log(
        `Gamification processed for referral ${payload.referralId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process gamification for referral ${payload.referralId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
