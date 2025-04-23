import { ActivityType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly followsService: FollowsService,
  ) {}

  private mapUserToDto(user: UserEntity): ActivityUserDto | undefined {
    if (!user) return undefined;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private mapCommentToDto(
    comment: CommentEntity | null | undefined,
    depth = 0,
    maxDepth = 1,
  ): ActivityCommentDto | null {
    if (!comment || depth > maxDepth) return null;
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
      tokenMintAddress: comment.tokenMintAddress,
      parent: this.mapCommentToDto(comment.parent, depth + 1, maxDepth),
    };
  }

  private mapTokenCallToDto(
    tokenCall: TokenCallEntity | null | undefined,
  ): ActivityTokenCallDto | undefined {
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
      tokenMintAddress: tokenCall.tokenId,
    };
  }

  async getFollowingFeed(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedFeedResultDto> {
    const offset = (page - 1) * limit;

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

    const desiredActivityTypes: ActivityType[] = [
      ActivityType.POST,
      ActivityType.COMMENT,
      ActivityType.UPVOTE,
      ActivityType.DOWNVOTE,
      ActivityType.PREDICTION,
    ];
    const commentAssociatedTypes: ActivityType[] = [
      ActivityType.POST,
      ActivityType.COMMENT,
      ActivityType.UPVOTE,
      ActivityType.DOWNVOTE,
    ];
    const predictionAssociatedType: ActivityType = ActivityType.PREDICTION;

    const queryBuilder = this.userActivityRepository
      .createQueryBuilder('activity')
      .select('activity')
      .innerJoinAndSelect('activity.user', 'user')
      .where('activity.userId IN (:...followedUserIds)', { followedUserIds })
      .andWhere('activity.activityType IN (:...desiredActivityTypes)', {
        desiredActivityTypes,
      })
      .leftJoin(
        'comments',
        'comment',
        'activity.entity_id::uuid = comment.id AND activity.activityType IN (:...commentAssociatedTypes)',
        { commentAssociatedTypes },
      )
      .leftJoin(
        'token_calls',
        'token_call',
        'activity.entity_id::uuid = token_call.id AND activity.activityType = :predictionAssociatedType',
        { predictionAssociatedType },
      )
      .andWhere(
        '( (comment.id IS NOT NULL AND activity.activityType IN (:...commentAssociatedTypes)) OR ' +
          '  (token_call.id IS NOT NULL AND activity.activityType = :predictionAssociatedType) )',
        { commentAssociatedTypes, predictionAssociatedType },
      )
      .orderBy('activity.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [activities, total] = await queryBuilder.getManyAndCount();

    if (activities.length === 0) {
      this.logger.log(
        `No valid activities found for user ${userId} on page ${page}. Total valid: ${total}`,
      );
      return {
        data: [],
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const commentEntityIds = new Set<string>();
    const tokenCallEntityIds = new Set<string>();

    activities.forEach((activity) => {
      if (!activity.entityId) return;

      if (commentAssociatedTypes.includes(activity.activityType)) {
        commentEntityIds.add(activity.entityId);
      } else if (activity.activityType === predictionAssociatedType) {
        tokenCallEntityIds.add(activity.entityId);
      }
    });

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

    const commentsMap = new Map(comments.map((c) => [c.id, c]));
    const tokenCallsMap = new Map(tokenCalls.map((tc) => [tc.id, tc]));

    const enrichedActivityDtos: EnrichedActivityDto[] = activities
      .map((activity) => {
        const activityUserDto = this.mapUserToDto(activity.user);
        if (!activityUserDto) {
          this.logger.warn(
            `Activity ${activity.id} is missing user data. Skipping.`,
          );
          return null;
        }

        let mappedComment: ActivityCommentDto | null = null;
        let mappedTokenCall: ActivityTokenCallDto | undefined = undefined;

        if (commentAssociatedTypes.includes(activity.activityType)) {
          const comment = commentsMap.get(activity.entityId);
          if (comment) {
            mappedComment = this.mapCommentToDto(comment);
          } else {
            this.logger.warn(
              `Activity ${activity.id} (type ${activity.activityType}) references Comment ${activity.entityId}, but it was not found in batch fetch. Should have been filtered by main query.`,
            );
            return null;
          }
        } else if (activity.activityType === predictionAssociatedType) {
          const tokenCall = tokenCallsMap.get(activity.entityId);
          if (tokenCall) {
            mappedTokenCall = this.mapTokenCallToDto(tokenCall);
          } else {
            this.logger.warn(
              `Activity ${activity.id} (type ${activity.activityType}) references TokenCall ${activity.entityId}, but it was not found in batch fetch. Should have been filtered by main query.`,
            );
            return null;
          }
        }

        if (!mappedComment && !mappedTokenCall) {
          this.logger.warn(
            `Activity ${activity.id} (type ${activity.activityType}) could not be mapped to a comment or token call DTO. Skipping.`,
          );
          return null;
        }

        const createdAtDate =
          typeof activity.createdAt === 'string'
            ? new Date(activity.createdAt)
            : activity.createdAt;
        if (
          !(createdAtDate instanceof Date) ||
          isNaN(createdAtDate.getTime())
        ) {
          this.logger.warn(
            `Activity ${activity.id} has invalid createdAt value: ${activity.createdAt}. Skipping.`,
          );
          return null;
        }

        return {
          id: activity.id,
          activityType: activity.activityType,
          createdAt: createdAtDate,
          user: activityUserDto,
          comment: mappedComment ?? undefined,
          tokenCall: mappedTokenCall ?? undefined,
        };
      })
      .filter(Boolean) as EnrichedActivityDto[];

    return {
      data: enrichedActivityDtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
