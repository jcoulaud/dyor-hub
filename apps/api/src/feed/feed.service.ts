import { ActivityType } from '@dyor-hub/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CommentEntity } from '../entities/comment.entity';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserActivityEntity } from '../entities/user-activity.entity';
import { UserEntity } from '../entities/user.entity';
import { FollowsService } from '../follows/follows.service';
import {
  ActivityCommentDto,
  ActivityTokenCallDto,
  ActivityUserDto,
  EnrichedActivityDto,
  PaginatedFeedResultDto,
} from './dto/feed-activity.dto';

interface EnrichedUserActivityInternal extends UserActivityEntity {
  comment?: CommentEntity;
  tokenCall?: TokenCallEntity;
  user: UserEntity;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly followsService: FollowsService,
  ) {}

  private mapUserToDto(user: UserEntity): ActivityUserDto {
    if (!user) return undefined;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private mapCommentToDto(comment: CommentEntity): ActivityCommentDto {
    if (!comment) return undefined;
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      userId: comment.userId,
      user: this.mapUserToDto(comment.user),
      parentId: comment.parentId,
      isReply: !!comment.parentId,
      parent: comment.parent ? this.mapCommentToDto(comment.parent) : null,
    };
  }

  private mapTokenCallToDto(tokenCall: TokenCallEntity): ActivityTokenCallDto {
    if (!tokenCall) return undefined;
    return {
      id: tokenCall.id,
      callTimestamp: tokenCall.callTimestamp,
      targetDate: tokenCall.targetDate,
      referencePrice: tokenCall.referencePrice,
      targetPrice: tokenCall.targetPrice,
      referenceSupply: tokenCall.referenceSupply,
      userId: tokenCall.userId,
      user: this.mapUserToDto(tokenCall.user),
    };
  }

  async getFollowingFeed(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedFeedResultDto> {
    const offset = (page - 1) * limit;

    // 1. Get the list of users the current user follows
    // TODO: Handle pagination if the followed list is huge?
    const followingResult = await this.followsService.getFollowing(
      userId,
      1,
      1000,
    );
    const followedUserIds = followingResult.data.map((user) => user.id);

    if (followedUserIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    // 2. Define desired activity types
    const desiredActivityTypes = [
      ActivityType.POST,
      ActivityType.COMMENT,
      ActivityType.UPVOTE,
      ActivityType.DOWNVOTE,
    ];

    // 3. Get filtered activities with the user relation FOR THE CURRENT PAGE
    const [activities, totalFromInitialQuery] =
      await this.userActivityRepository.findAndCount({
        where: {
          userId: In(followedUserIds),
          activityType: In(desiredActivityTypes),
        },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
        relations: ['user'],
      });

    // 3b. Get the ACCURATE total count of VALID activities
    const countQueryBuilder = this.userActivityRepository
      .createQueryBuilder('activity')
      .where('activity.userId IN (:...followedUserIds)', { followedUserIds })
      .andWhere('activity.activityType IN (:...desiredActivityTypes)', {
        desiredActivityTypes,
      })
      // Join comments
      .leftJoin(
        'comments',
        'comment',
        'activity.entity_id::uuid = comment.id AND activity.activityType IN (:...commentTypes)',
        {
          commentTypes: [
            ActivityType.COMMENT,
            ActivityType.UPVOTE,
            ActivityType.DOWNVOTE,
          ],
        },
      )
      // Join token calls conditionally
      .leftJoin(
        'token_calls',
        'token_call',
        'activity.entity_id::uuid = token_call.id AND activity.activityType = :postType',
        { postType: ActivityType.POST },
      )
      // Only count if the corresponding join was successful
      .andWhere('(comment.id IS NOT NULL OR token_call.id IS NOT NULL)');

    const accurateTotal = await countQueryBuilder.getCount();

    if (activities.length === 0) {
      // Even if activities on this page are zero, the total might be non-zero
      return {
        data: [],
        meta: {
          total: accurateTotal,
          page,
          limit,
          totalPages: Math.ceil(accurateTotal / limit),
        },
      };
    }

    // 4. Collect entity IDs for batch fetching
    const commentEntityIds = new Set<string>();
    const tokenCallEntityIds = new Set<string>();

    activities.forEach((activity) => {
      if (!activity.entityId) return;

      if (
        activity.activityType === ActivityType.COMMENT ||
        activity.activityType === ActivityType.UPVOTE ||
        activity.activityType === ActivityType.DOWNVOTE
      ) {
        commentEntityIds.add(activity.entityId);
      } else if (activity.activityType === ActivityType.POST) {
        tokenCallEntityIds.add(activity.entityId);
      }
    });

    // 5. Batch fetch related Comments and TokenCalls with their authors
    const [comments, tokenCalls] = await Promise.all([
      commentEntityIds.size > 0
        ? this.commentRepository.find({
            where: { id: In(Array.from(commentEntityIds)) },
            relations: ['user', 'parent', 'parent.user'],
          })
        : Promise.resolve([]),
      tokenCallEntityIds.size > 0
        ? this.tokenCallRepository.find({
            where: { id: In(Array.from(tokenCallEntityIds)) },
            relations: ['user'],
          })
        : Promise.resolve([]),
    ]);

    // 6. Create lookup maps for efficient access
    const commentsMap = new Map(comments.map((c) => [c.id, c]));
    const tokenCallsMap = new Map(tokenCalls.map((tc) => [tc.id, tc]));

    // 7. Enrich activities
    const enrichedActivitiesInternal: EnrichedUserActivityInternal[] =
      activities.map((activity) => {
        const enriched: EnrichedUserActivityInternal = {
          ...(activity as UserActivityEntity & { user: UserEntity }),
          comment: undefined,
          tokenCall: undefined,
        };

        if (!activity.entityId) return enriched;

        if (
          activity.activityType === ActivityType.COMMENT ||
          activity.activityType === ActivityType.UPVOTE ||
          activity.activityType === ActivityType.DOWNVOTE
        ) {
          enriched.comment = commentsMap.get(activity.entityId);
        } else if (activity.activityType === ActivityType.POST) {
          enriched.tokenCall = tokenCallsMap.get(activity.entityId);
        }
        return enriched;
      });

    // 8. Map internal representation to DTOs, filtering out orphans
    const enrichedActivityDtos: EnrichedActivityDto[] =
      enrichedActivitiesInternal.reduce((acc, activity) => {
        let includeActivity = false;
        let mappedComment: ActivityCommentDto | undefined = undefined;
        let mappedTokenCall: ActivityTokenCallDto | undefined = undefined;

        // Check if the required entity exists based on type
        if (
          (activity.activityType === ActivityType.COMMENT ||
            activity.activityType === ActivityType.UPVOTE ||
            activity.activityType === ActivityType.DOWNVOTE) &&
          activity.comment
        ) {
          includeActivity = true;
          mappedComment = this.mapCommentToDto(activity.comment);
        } else if (
          activity.activityType === ActivityType.POST &&
          activity.tokenCall
        ) {
          includeActivity = true;
          mappedTokenCall = this.mapTokenCallToDto(activity.tokenCall);
        }

        if (includeActivity) {
          acc.push({
            id: activity.id,
            activityType: activity.activityType,
            createdAt: activity.createdAt,
            user: this.mapUserToDto(activity.user),
            comment: mappedComment,
            tokenCall: mappedTokenCall,
          });
        }

        return acc;
      }, [] as EnrichedActivityDto[]);

    // 9. Return paginated DTO result
    return {
      data: enrichedActivityDtos,
      meta: {
        total: accurateTotal, // Use the accurate total from the count query
        page,
        limit,
        totalPages: Math.ceil(accurateTotal / limit),
      },
    };
  }
}
