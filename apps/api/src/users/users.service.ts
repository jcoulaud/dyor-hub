import { UserPreferences, defaultUserPreferences } from '@dyor-hub/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { UserEntity } from '../entities/user.entity';
import { UserActivityDto } from './dto/user-activity.dto';
import { UserStatsDto } from './dto/user-stats.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly commentVoteRepository: Repository<CommentVoteEntity>,
  ) {}

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.isAdmin',
        'user.preferences',
      ])
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .getOne();
  }

  async getUserPreferences(userId: string): Promise<Partial<UserPreferences>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return {
      ...defaultUserPreferences,
      ...(user?.preferences || {}),
    };
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<Partial<UserPreferences>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedPreferences = {
      ...(user.preferences || {}),
      ...preferences,
    };

    await this.userRepository.update(userId, {
      preferences: updatedPreferences,
    });

    return {
      ...defaultUserPreferences,
      ...updatedPreferences,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const commentsCount = await this.commentRepository.count({
      where: {
        userId,
        parentId: IsNull(),
      },
    });

    const repliesCount = await this.commentRepository.count({
      where: {
        userId,
        parentId: Not(IsNull()),
      },
    });

    const upvotesCount = await this.commentVoteRepository.count({
      where: {
        userId,
        type: 'upvote',
      },
    });

    const downvotesCount = await this.commentVoteRepository.count({
      where: {
        userId,
        type: 'downvote',
      },
    });

    return UserStatsDto.fromRaw({
      comments: commentsCount,
      replies: repliesCount,
      upvotes: upvotesCount,
      downvotes: downvotesCount,
    });
  }

  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: string,
    sort: 'recent' | 'popular' = 'recent',
  ): Promise<PaginatedResult<UserActivityDto>> {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));
    const skip = (page - 1) * limit;

    let commentsQuery = `
      SELECT 
        c.id as id,
        c.content as content,
        c.token_mint_address as "tokenMintAddress",
        c.created_at as "createdAt",
        c.upvotes_count as upvotes,
        c.downvotes_count as downvotes,
        t.symbol as "tokenSymbol",
        CASE WHEN c.parent_id IS NOT NULL THEN true ELSE false END as "isReply",
        false as "isUpvote",
        false as "isDownvote",
        c.parent_id as "parentCommentId",
        CASE WHEN c.removed_by_id IS NOT NULL THEN true ELSE false END as "isRemoved",
        'comment' as type
      FROM comments c
      LEFT JOIN tokens t ON c.token_mint_address = t.mint_address
      WHERE c.user_id = $1
    `;

    let votesQuery = `
      SELECT 
        cv.id as id,
        c.content as content,
        c.token_mint_address as "tokenMintAddress",
        cv.created_at as "createdAt",
        c.upvotes_count as upvotes,
        c.downvotes_count as downvotes,
        t.symbol as "tokenSymbol",
        CASE WHEN c.parent_id IS NOT NULL THEN true ELSE false END as "isReply",
        CASE WHEN cv.vote_type = 'upvote' THEN true ELSE false END as "isUpvote",
        CASE WHEN cv.vote_type = 'downvote' THEN true ELSE false END as "isDownvote",
        c.parent_id as "parentCommentId",
        CASE WHEN c.removed_by_id IS NOT NULL THEN true ELSE false END as "isRemoved",
        'vote' as type
      FROM comment_votes cv
      JOIN comments c ON c.id = cv.comment_id
      LEFT JOIN tokens t ON c.token_mint_address = t.mint_address
      WHERE cv.user_id = $1
    `;

    const queryParams: any[] = [userId];
    let paramCount = 1;

    if (type) {
      switch (type) {
        case 'comments':
          commentsQuery += ` AND c.parent_id IS NULL`;
          votesQuery = '';
          break;
        case 'replies':
          commentsQuery += ` AND c.parent_id IS NOT NULL`;
          votesQuery = '';
          break;
        case 'upvotes':
          commentsQuery = '';
          votesQuery += ` AND cv.vote_type = 'upvote'`;
          break;
        case 'downvotes':
          commentsQuery = '';
          votesQuery += ` AND cv.vote_type = 'downvote'`;
          break;
      }
    }

    let fullQuery = '';
    if (commentsQuery && votesQuery) {
      fullQuery = `(${commentsQuery}) UNION ALL (${votesQuery})`;
    } else if (commentsQuery) {
      fullQuery = commentsQuery;
    } else if (votesQuery) {
      fullQuery = votesQuery;
    }

    const orderBy =
      sort === 'popular' ? `(upvotes - downvotes) DESC` : `"createdAt" DESC`;

    const countQuery = `SELECT COUNT(*) FROM (${fullQuery}) as count_all`;
    const mainQuery = `
      SELECT * FROM (${fullQuery}) as combined 
      ORDER BY ${orderBy}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const countResult = await this.userRepository.manager.query(
      countQuery,
      queryParams,
    );
    const total = parseInt(countResult[0].count, 10);

    const mainQueryParams = [...queryParams, limit, skip];
    const rawResults = await this.userRepository.manager.query(
      mainQuery,
      mainQueryParams,
    );

    const result: UserActivityDto[] = rawResults.map((raw) => {
      return new UserActivityDto({
        id: raw.id,
        content: raw.content,
        tokenMintAddress: raw.tokenMintAddress,
        createdAt: new Date(raw.createdAt).toISOString(),
        upvotes: parseInt(raw.upvotes, 10),
        downvotes: parseInt(raw.downvotes, 10),
        tokenSymbol: raw.tokenSymbol || '',
        isReply:
          raw.isReply === true || raw.isReply === 'true' || raw.isReply === 1,
        isUpvote:
          raw.isUpvote === true ||
          raw.isUpvote === 'true' ||
          raw.isUpvote === 1,
        isDownvote:
          raw.isDownvote === true ||
          raw.isDownvote === 'true' ||
          raw.isDownvote === 1,
        parentCommentId: raw.parentCommentId,
        isRemoved:
          raw.isRemoved === true ||
          raw.isRemoved === 'true' ||
          raw.isRemoved === 1,
      });
    });

    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
