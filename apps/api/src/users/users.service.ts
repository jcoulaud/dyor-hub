import {
  defaultUserPreferences,
  UserPreferences,
  UserSearchResult,
} from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, IsNull, Not, Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { UserReputationEntity } from '../entities/user-reputation.entity';
import { UserStreakEntity } from '../entities/user-streak.entity';
import { UserEntity } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserActivityDto } from './dto/user-activity.dto';
import { UserStatsDto } from './dto/user-stats.dto';

function processBio(bio: string): string {
  if (!bio) return bio;

  let processedBio = bio.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  processedBio = processedBio.replace(/(\n[\s\t]*){2,}/g, '\n\n');
  processedBio = processedBio.replace(/\n{3,}/g, '\n\n');

  processedBio = processedBio.trim();

  return processedBio;
}

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
  private readonly logger = new Logger(UsersService.name);
  private readonly isProduction: boolean;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly commentVoteRepository: Repository<CommentVoteEntity>,
    @InjectRepository(UserReputationEntity)
    private readonly userReputationRepository: Repository<UserReputationEntity>,
    @InjectRepository(UserStreakEntity)
    private readonly userStreakRepository: Repository<UserStreakEntity>,
    private readonly configService: ConfigService,
    private readonly entityManager: EntityManager,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.username',
          'user.displayName',
          'user.avatarUrl',
          'user.bio',
          'user.isAdmin',
          'user.preferences',
          'user.createdAt',
          'user.updatedAt',
          'user.referralCode',
          'wallets.address',
          'wallets.isPrimary',
          'wallets.isVerified',
        ])
        .leftJoin('user.wallets', 'wallets')
        .leftJoinAndSelect('user.createdTokens', 'createdTokens')
        .addSelect(['createdTokens.mintAddress', 'createdTokens.symbol'])
        .where('LOWER(user.username) = LOWER(:username)', { username })
        .getOne();

      if (!user && !this.isProduction) {
        this.logger.debug(`User with username ${username} not found`);
      }

      return user;
    } catch (error) {
      this.logger.error(`Error finding user with username ${username}:`, error);
      throw error;
    }
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

  async updateUserProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (updateProfileDto.displayName !== undefined) {
      user.displayName = updateProfileDto.displayName;
    }
    if (updateProfileDto.bio !== undefined) {
      user.bio = processBio(updateProfileDto.bio);
    }

    await this.userRepository.save(user);
    return user;
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

    // Get streak data if available
    let streak = null;
    try {
      streak = await this.userStreakRepository.findOne({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(`Error retrieving streak data: ${error.message}`);
    }

    // Get reputation data if available
    let reputation = null;
    try {
      reputation = await this.userReputationRepository.findOne({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(`Error retrieving reputation data: ${error.message}`);
    }

    return UserStatsDto.fromRaw({
      comments: commentsCount,
      replies: repliesCount,
      upvotes: upvotesCount,
      downvotes: downvotesCount,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      reputation: reputation?.totalPoints || 0,
    });
  }

  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: string,
    sort: 'recent' | 'popular' = 'recent',
    search?: string,
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
        t.name as "tokenName",
        CASE WHEN c.parent_id IS NOT NULL THEN true ELSE false END as "isReply",
        false as "isUpvote",
        false as "isDownvote",
        c.parent_id as "parentCommentId",
        c.removed_by_id as "removedById",
        c.user_id as "commentUserId",
        'comment' as type
      FROM comments c
      LEFT JOIN tokens t ON c.token_mint_address = t.mint_address
      WHERE c.user_id = $1
    `;

    let votesQuery = `
      SELECT
        c.id as id,
        c.content as content,
        c.token_mint_address as "tokenMintAddress",
        cv.created_at as "createdAt",
        c.upvotes_count as upvotes,
        c.downvotes_count as downvotes,
        t.symbol as "tokenSymbol",
        t.name as "tokenName",
        CASE WHEN c.parent_id IS NOT NULL THEN true ELSE false END as "isReply",
        CASE WHEN cv.vote_type = 'upvote' THEN true ELSE false END as "isUpvote",
        CASE WHEN cv.vote_type = 'downvote' THEN true ELSE false END as "isDownvote",
        c.parent_id as "parentCommentId",
        c.removed_by_id as "removedById",
        c.user_id as "commentUserId",
        'vote' as type
      FROM comment_votes cv
      JOIN comments c ON c.id = cv.comment_id
      LEFT JOIN tokens t ON c.token_mint_address = t.mint_address
      WHERE cv.user_id = $1
    `;

    const queryParams: any[] = [userId];
    let paramCount = 1;

    // Apply filter by type
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

    // Apply search filter if search term is provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      paramCount++;

      if (commentsQuery) {
        commentsQuery += ` AND (
          LOWER(c.content) LIKE $${paramCount} OR 
          LOWER(t.symbol) LIKE $${paramCount} OR 
          LOWER(t.name) LIKE $${paramCount}
        )`;
      }

      if (votesQuery) {
        votesQuery += ` AND (
          LOWER(c.content) LIKE $${paramCount} OR 
          LOWER(t.symbol) LIKE $${paramCount} OR 
          LOWER(t.name) LIKE $${paramCount}
        )`;
      }

      queryParams.push(searchTerm);
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
    const total = await this.userRepository.manager
      .query(countQuery, queryParams)
      .then((result) => parseInt(result[0].count, 10));

    // Execute the main query to get the data
    const mainQuery = `
      SELECT * FROM (${fullQuery}) as combined 
      ORDER BY ${orderBy}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    const mainQueryParams = [...queryParams, limit, skip];
    const rawResults = await this.userRepository.manager.query(
      mainQuery,
      mainQueryParams,
    );

    const result: UserActivityDto[] = rawResults.map((raw) => {
      const isRemoved = !!raw.removedById;
      const content = isRemoved
        ? `Comment removed by ${raw.removedById === raw.commentUserId ? 'user' : 'moderator'}`
        : raw.content;

      return new UserActivityDto({
        id: raw.id,
        content: content,
        tokenMintAddress: raw.tokenMintAddress,
        createdAt: new Date(raw.createdAt).toISOString(),
        upvotes: parseInt(raw.upvotes, 10) || 0,
        downvotes: parseInt(raw.downvotes, 10) || 0,
        tokenSymbol: raw.tokenSymbol || '',
        tokenName: raw.tokenName || '',
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
        isRemoved: isRemoved,
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

  async findById(id: string): Promise<UserEntity | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: {
          createdTokens: true,
        },
      });
      return user;
    } catch (error) {
      this.logger.error(`Error finding user with id ${id}:`, error);
      return null;
    }
  }

  // --- Admin Methods ---

  async findRecentUsers(limit: number): Promise<UserEntity[]> {
    try {
      const users = await this.userRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
        select: [
          'id',
          'username',
          'displayName',
          'avatarUrl',
          'isAdmin',
          'preferences',
          'createdAt',
        ],
      });
      return users;
    } catch (error) {
      this.logger.error(`Error finding recent users (limit ${limit}):`, error);
      throw error;
    }
  }

  async findPaginatedUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: UserEntity[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = {};

      if (search) {
        whereClause.username = ILike(`%${search}%`);
      }

      const [data, total] = await this.userRepository.findAndCount({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: limit,
        skip: skip,
        select: [
          'id',
          'username',
          'displayName',
          'avatarUrl',
          'isAdmin',
          'preferences',
          'createdAt',
        ],
      });

      return { data, total };
    } catch (error) {
      this.logger.error(
        `Error finding paginated users (page ${page}, limit ${limit}, search ${search}):`,
        error,
      );
      throw error;
    }
  }

  async searchUsers(
    query: string,
    limit: number = 10,
  ): Promise<UserSearchResult[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    try {
      const users = await this.userRepository.find({
        where: [
          { username: ILike(`%${query}%`) },
          { displayName: ILike(`%${query}%`) },
        ],
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
        take: limit,
        order: {
          username: 'ASC',
        },
      });
      return users;
    } catch (error) {
      this.logger.error(`Error searching users with query "${query}":`, error);
      return [];
    }
  }
}
