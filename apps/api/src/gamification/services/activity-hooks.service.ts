import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityType } from '../../entities';
import { ActivityTrackingService } from './activity-tracking.service';

export enum GamificationEvent {
  COMMENT_CREATED = 'comment.created',
  COMMENT_VOTED = 'comment.voted',
  POST_CREATED = 'post.created',
  USER_LOGGED_IN = 'user.logged_in',
}

export interface CommentCreatedEvent {
  userId: string;
  commentId: string;
}

export interface CommentVotedEvent {
  userId: string;
  commentId: string;
  voteType: 'upvote' | 'downvote';
}

export interface PostCreatedEvent {
  userId: string;
  postId: string;
}

export interface UserLoggedInEvent {
  userId: string;
}

@Injectable()
export class ActivityHooksService {
  private readonly logger = new Logger(ActivityHooksService.name);

  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
  ) {}

  @OnEvent(GamificationEvent.COMMENT_CREATED)
  async handleCommentCreated(event: CommentCreatedEvent) {
    try {
      await this.activityTrackingService.trackActivity(
        event.userId,
        ActivityType.COMMENT,
        event.commentId,
        'comment',
      );
    } catch (error) {
      this.logger.error(
        `Failed to track comment activity: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(GamificationEvent.COMMENT_VOTED)
  async handleCommentVoted(event: CommentVotedEvent) {
    try {
      await this.activityTrackingService.trackActivity(
        event.userId,
        ActivityType.UPVOTE,
        event.commentId,
        'comment',
      );
    } catch (error) {
      this.logger.error(
        `Failed to track vote activity: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(GamificationEvent.POST_CREATED)
  async handlePostCreated(event: PostCreatedEvent) {
    try {
      await this.activityTrackingService.trackActivity(
        event.userId,
        ActivityType.POST,
        event.postId,
        'post',
      );
    } catch (error) {
      this.logger.error(
        `Failed to track post activity: ${error.message}`,
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
    } catch (error) {
      this.logger.error(
        `Failed to track login activity: ${error.message}`,
        error.stack,
      );
    }
  }
}
