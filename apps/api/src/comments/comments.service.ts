import {
  NotificationEventType,
  UpdateCommentDto,
  VoteType,
} from '@dyor-hub/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { GamificationEvent } from '../gamification/services/activity-hooks.service';
import { PerspectiveService } from '../services/perspective.service';
import { TelegramAdminService } from '../telegram/admin/telegram-admin.service';
import { sanitizeHtml } from '../utils/utils';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { LatestCommentResponseDto } from './dto/latest-comment-response.dto';
import { VoteResponseDto } from './dto/vote-response.dto';

@Injectable()
export class CommentsService {
  // Edit window duration for a comment
  private readonly EDIT_WINDOW_MS = 15 * 60 * 1000;
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly voteRepository: Repository<CommentVoteEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly perspectiveService: PerspectiveService,
    private readonly telegramAdminService: TelegramAdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findByTokenMintAddress(
    tokenMintAddress: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'best',
  ): Promise<{
    data: CommentResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    try {
      // 1. Fetch Paginated Root Comments
      const rootCommentQueryBase = this.commentRepository
        .createQueryBuilder('comment')
        .where('comment.tokenMintAddress = :tokenMintAddress', {
          tokenMintAddress,
        })
        .andWhere('comment.parentId IS NULL'); // Fetch only root comments

      // Get total count of ROOT comments for pagination meta
      const totalRootComments = await rootCommentQueryBase.getCount();

      // Clone base query for fetching data
      const rootCommentQuery = rootCommentQueryBase
        .clone()
        .leftJoinAndSelect('comment.user', 'user'); // Need user for sorting/display

      // Apply sorting for root comments
      let orderByClause: { [key: string]: 'ASC' | 'DESC' } = {};
      let sortInMemory = false;
      if (sortBy === 'new') {
        orderByClause = { 'comment.createdAt': 'DESC' };
      } else if (sortBy === 'old') {
        orderByClause = { 'comment.createdAt': 'ASC' };
      } else {
        // For 'best' and 'controversial', we fetch by creation date first
        // and then sort the final list in memory
        orderByClause = { 'comment.createdAt': 'DESC' };
        sortInMemory = true;
      }
      Object.keys(orderByClause).forEach((key) => {
        rootCommentQuery.addOrderBy(key, orderByClause[key]);
      });

      // Apply pagination to root comment query
      rootCommentQuery.skip((page - 1) * limit).take(limit);

      const rootComments = await rootCommentQuery.getMany();

      if (rootComments.length === 0) {
        return {
          data: [],
          meta: {
            total: totalRootComments,
            page,
            limit,
            totalPages: Math.ceil(totalRootComments / limit),
          },
        };
      }

      const rootCommentIds = rootComments.map((c) => c.id);

      // 2. Fetch All Descendants for these Root Comments
      const recursiveQuery = `
        WITH RECURSIVE comment_tree AS (
          -- Anchor member: Direct children of the root comments on the current page
          SELECT
            c.*,
            1 as depth
          FROM comments c
          WHERE c."parent_id" = ANY($1)

          UNION ALL

          -- Recursive member: Children of comments already in the tree
          SELECT
            c.*,
            ct.depth + 1
          FROM comments c
          JOIN comment_tree ct ON c."parent_id" = ct.id
          WHERE ct.depth < 10 -- Limit recursion depth for safety
        )
        SELECT id FROM comment_tree;
      `;

      // Execute the raw recursive query to get all descendant IDs
      const descendantIdsResult = await this.commentRepository.query(
        recursiveQuery,
        [rootCommentIds],
      );
      const descendantIds = descendantIdsResult.map((r) => r.id);

      let allComments: CommentEntity[] = [...rootComments];

      // Fetch descendant entities if any exist
      if (descendantIds.length > 0) {
        const descendants = await this.commentRepository.find({
          where: { id: In(descendantIds) },
          relations: ['user', 'removedBy'],
        });
        allComments = [...rootComments, ...descendants];
      }

      const allCommentIds = allComments.map((c) => c.id);

      // 3. Fetch User Votes for all involved comments
      const userVotesMap = new Map<string, VoteType>();
      if (currentUserId && allCommentIds.length > 0) {
        const votes = await this.voteRepository.find({
          where: { userId: currentUserId, commentId: In(allCommentIds) },
        });
        votes.forEach((v) => userVotesMap.set(v.commentId, v.type));
      }

      // 4. Build Tree Structure & Sort Replies
      const commentMap = new Map<string, CommentResponseDto>();
      const finalRootCommentsDTO: CommentResponseDto[] = [];

      // Map all comments to DTOs first, including user vote
      allComments.forEach((comment) => {
        const userDto = comment.user
          ? {
              id: comment.user.id,
              username: comment.user.username,
              displayName: comment.user.displayName,
              avatarUrl: comment.user.avatarUrl,
            }
          : null;

        if (!userDto) {
          this.logger.warn(`User data missing for comment ID: ${comment.id}`);
          return;
        }

        commentMap.set(comment.id, {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          voteCount: comment.upvotes - comment.downvotes,
          parentId: comment.parentId,
          user: userDto,
          userVoteType: userVotesMap.get(comment.id) || null,
          isRemoved: !!comment.removedById,
          isEdited: comment.isEdited,
          removedBy:
            comment.removedById && comment.removedBy
              ? {
                  id: comment.removedBy.id,
                  isSelf: comment.removedBy.id === comment.userId,
                }
              : null,
          replies: [],
        });
      });

      // Build the tree structure
      commentMap.forEach((commentDto, commentId) => {
        if (commentDto.parentId && commentMap.has(commentDto.parentId)) {
          // Ensure parent's replies array exists
          const parentDto = commentMap.get(commentDto.parentId)!;
          if (!parentDto.replies) {
            parentDto.replies = [];
          }
          parentDto.replies.push(commentDto);
        } else if (!commentDto.parentId && rootCommentIds.includes(commentId)) {
          // Add root comments that are on the current page
          finalRootCommentsDTO.push(commentDto);
        }
      });

      // Function to sort replies recursively based on sortBy
      const sortReplies = (
        commentsToSort: CommentResponseDto[],
        currentSortBy: string,
      ) => {
        let sortFn: (a: CommentResponseDto, b: CommentResponseDto) => number;
        switch (currentSortBy) {
          case 'new':
            sortFn = (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
          case 'old':
            sortFn = (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'controversial':
            sortFn = (a, b) => {
              // Sort comments with negative scores higher (more controversial)
              const aScore = a.voteCount;
              const bScore = b.voteCount;
              if (aScore < 0 && bScore >= 0) return -1;
              if (aScore >= 0 && bScore < 0) return 1;
              // If both have same sign, fall back to sorting by 'best' (highest absolute score first)
              return b.voteCount - a.voteCount;
            };
            break;
          case 'best':
          default:
            sortFn = (a, b) => b.voteCount - a.voteCount;
            break;
        }

        try {
          commentsToSort.sort(sortFn);
        } catch (e) {
          this.logger.error(`Error sorting replies: ${e}`);
          // Default sort
          commentsToSort.sort((a, b) => b.voteCount - a.voteCount);
        }

        commentsToSort.forEach((c) => {
          if (c.replies && c.replies.length > 0) {
            sortReplies(c.replies, currentSortBy);
          }
        });
      };

      // Sort the replies within each root comment DTO
      finalRootCommentsDTO.forEach((root) => {
        if (root.replies && root.replies.length > 0) {
          sortReplies(root.replies, sortBy);
        }
      });

      // 5. Sort Root Comments
      if (sortInMemory) {
        if (sortBy === 'best') {
          finalRootCommentsDTO.sort((a, b) => b.voteCount - a.voteCount);
        } else if (sortBy === 'controversial') {
          sortReplies(finalRootCommentsDTO, sortBy);
        }
      }

      // Final mapping for removed content, etc.
      const finalData = finalRootCommentsDTO.map((comment) => ({
        ...comment,
        content: comment.isRemoved
          ? `Comment removed by ${comment.removedBy?.isSelf ? 'user' : 'moderator'}`
          : comment.content,
      }));

      return {
        data: finalData,
        meta: {
          total: totalRootComments,
          page,
          limit,
          totalPages: Math.ceil(totalRootComments / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to find comments for ${tokenMintAddress}:`,
        error,
      );
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }
  }

  async findById(
    id: string,
    currentUserId?: string,
  ): Promise<CommentResponseDto | null> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id },
        relations: ['user', 'removedBy'],
      });

      if (!comment) {
        return null;
      }

      let userVote = null;
      if (currentUserId) {
        userVote = await this.voteRepository.findOne({
          where: {
            userId: currentUserId,
            commentId: id,
          },
        });
      }

      return {
        id: comment.id,
        content: comment.removedById
          ? `Comment removed by ${comment.removedBy?.id === comment.userId ? 'user' : 'moderator'}`
          : comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        voteCount: comment.upvotes - comment.downvotes,
        parentId: comment.parentId,
        user: {
          id: comment.user.id,
          username: comment.user.username,
          displayName: comment.user.displayName,
          avatarUrl: comment.user.avatarUrl,
        },
        userVoteType: userVote?.type || null,
        isRemoved: !!comment.removedById,
        isEdited: comment.isEdited,
        removedBy: comment.removedById
          ? {
              id: comment.removedBy.id,
              isSelf: comment.removedBy.id === comment.userId,
            }
          : null,
      };
    } catch (error) {
      return null;
    }
  }

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    try {
      let targetTokenMintAddress = createCommentDto.tokenMintAddress;
      let parentComment: CommentEntity | null = null;

      // If this is a reply, find the parent comment
      if (createCommentDto.parentId) {
        parentComment = await this.commentRepository.findOne({
          where: { id: createCommentDto.parentId },
          relations: ['user'],
        });

        if (!parentComment) {
          throw new BadRequestException(
            `Parent comment with ID ${createCommentDto.parentId} not found`,
          );
        }

        // Use the parent's token address for consistency
        targetTokenMintAddress = parentComment.tokenMintAddress;
      }

      // Find token by the determined mint address
      const token = await this.tokenRepository.findOne({
        where: { mintAddress: targetTokenMintAddress }, // Use targetTokenMintAddress
      });

      if (!token) {
        throw new BadRequestException(
          `Token with mint address ${targetTokenMintAddress} not found`,
        );
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check for toxicity using Perspective API
      try {
        const analysis = await this.perspectiveService.analyzeText(
          createCommentDto.content,
        );

        // Log whether we're checking or skipping in local environment
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            'In local environment - Perspective API check was skipped',
          );
        }

        if (analysis.isToxic) {
          throw new BadRequestException(
            'Comment contains toxic content and cannot be posted',
          );
        }
      } catch (error) {
        this.logger.warn(`Perspective API error: ${error.message}`);
      }

      const comment = new CommentEntity();
      comment.content = createCommentDto.content;
      comment.user = user;
      comment.userId = userId;
      comment.tokenMintAddress = targetTokenMintAddress; // Use the determined address
      comment.token = token;
      comment.parentId = createCommentDto.parentId || null;

      const savedComment = await this.commentRepository.save(comment);

      // Send notification to telegram channel
      try {
        await this.telegramAdminService.notifyNewComment(savedComment);
      } catch (error) {
        this.logger.error(
          `Failed to send telegram notification: ${error.message}`,
          error.stack,
        );
      }

      // Emit gamification event
      this.eventEmitter.emit(GamificationEvent.COMMENT_CREATED, {
        userId,
        commentId: savedComment.id,
        parentId: createCommentDto.parentId || null,
      });

      // If this is a reply, emit the notification event
      if (createCommentDto.parentId && parentComment) {
        if (parentComment.user.id !== userId) {
          // Don't notify for self-replies
          this.eventEmitter.emit(NotificationEventType.COMMENT_REPLY, {
            userId: parentComment.user.id, // Parent comment owner gets notified
            commentId: savedComment.id,
            replyAuthor: user.displayName,
            commentText: savedComment.content.substring(0, 100),
          });
        }
      }

      return savedComment;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new UnauthorizedException('Not authorized to update this comment');
    }

    const currentTime = new Date();
    const commentAge =
      currentTime.getTime() - new Date(comment.createdAt).getTime();

    if (commentAge > this.EDIT_WINDOW_MS) {
      throw new ForbiddenException(
        'Comments can only be edited within 15 minutes of posting',
      );
    }

    comment.content = dto.content;
    comment.updatedAt = currentTime;
    comment.isEdited = true;
    return this.commentRepository.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new UnauthorizedException('Not authorized to delete this comment');
    }

    await this.commentRepository.remove(comment);
  }

  async vote(
    commentId: string,
    userId: string,
    type: VoteType,
  ): Promise<VoteResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check if user has already voted this way
    const existingVote = await this.voteRepository.findOne({
      where: { commentId, userId },
    });

    // If same vote type exists, remove it (toggle off)
    if (existingVote?.type === type) {
      await this.voteRepository.remove(existingVote);

      // Get updated vote counts
      const votes = await this.voteRepository.find({ where: { commentId } });
      const upvotes = votes.filter((v) => v.type === 'upvote').length;
      const downvotes = votes.filter((v) => v.type === 'downvote').length;

      // Update comment with new vote counts
      await this.commentRepository.update(commentId, { upvotes, downvotes });

      return {
        upvotes,
        downvotes,
        userVoteType: null, // No active vote after toggle
      };
    }

    // Remove any existing vote (if different type)
    if (existingVote) {
      await this.voteRepository.remove(existingVote);
    }

    // Create new vote
    const vote = new CommentVoteEntity();
    vote.type = type;
    vote.userId = userId;
    vote.commentId = commentId;
    await this.voteRepository.save(vote);

    // Get updated vote counts
    const votes = await this.voteRepository.find({ where: { commentId } });
    const upvotes = votes.filter((v) => v.type === 'upvote').length;
    const downvotes = votes.filter((v) => v.type === 'downvote').length;

    // Update comment with new vote counts
    await this.commentRepository.update(commentId, { upvotes, downvotes });

    // Emit gamification event
    this.eventEmitter.emit(GamificationEvent.COMMENT_VOTED, {
      voterUserId: userId,
      commentOwnerUserId: comment.user.id,
      commentId,
      voteType: type,
    });

    // If this is an upvote, emit notification event for the comment owner
    if (type === 'upvote' && comment.user.id !== userId) {
      // Find voter's name - we only need this for the notification message
      const voterInfo = await this.userRepository.findOne({
        select: ['displayName', 'username'],
        where: { id: userId },
      });

      if (voterInfo) {
        // Use displayName directly, assuming it always exists
        const voterName = voterInfo.displayName;

        // Emit notification specific event
        this.eventEmitter.emit(NotificationEventType.COMMENT_UPVOTED, {
          userId: comment.user.id,
          commentId: comment.id,
          voterName: voterName,
        });
      }
    }

    return {
      upvotes,
      downvotes,
      userVoteType: type,
    };
  }

  async getVoteCount(
    commentId: string,
  ): Promise<{ upvotes: number; downvotes: number }> {
    const votes = await this.voteRepository.find({
      where: {
        comment: { id: commentId },
      },
      relations: {
        comment: true,
      },
    });

    return {
      upvotes: votes.filter((v) => v.type === 'upvote').length,
      downvotes: votes.filter((v) => v.type === 'downvote').length,
    };
  }

  async removeComment(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<CommentEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow admins or the comment owner to remove comments
    if (!isAdmin && comment.user.id !== userId) {
      throw new ForbiddenException('Not authorized to remove this comment');
    }

    // Update the comment with removal information
    comment.removedById = userId;
    comment.removalReason = isAdmin
      ? 'Removed by moderator'
      : 'Removed by user';

    return this.commentRepository.save(comment);
  }

  async findLatestComments(
    limit: number = 5,
  ): Promise<LatestCommentResponseDto[]> {
    const comments = await this.commentRepository.find({
      where: {
        removedById: IsNull(),
      },
      relations: {
        user: true,
        token: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    if (!comments || comments.length === 0) {
      return [];
    }

    return comments.map((comment) => ({
      id: comment.id,
      content: sanitizeHtml(comment.content),
      createdAt: comment.createdAt,
      token: {
        tokenMintAddress: comment.tokenMintAddress,
        symbol: comment.token.symbol,
      },
      user: {
        id: comment.user.id,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
      },
    }));
  }

  async findCommentThread(
    threadCommentId: string,
    currentUserId?: string,
    replySortBy: string = 'new',
  ): Promise<{ rootComment: CommentResponseDto }> {
    try {
      // 1. Find the specific comment requested
      const focusedComment = await this.commentRepository.findOne({
        where: { id: threadCommentId },
        relations: ['user'],
      });

      if (!focusedComment) {
        throw new NotFoundException(
          `Comment with ID ${threadCommentId} not found`,
        );
      }

      // 2. Find the Root Comment ID
      let rootCommentId = focusedComment.id;
      let currentParentId = focusedComment.parentId;
      while (currentParentId) {
        const parent = await this.commentRepository.findOne({
          select: ['id', 'parentId'], // Only select necessary fields for traversal
          where: { id: currentParentId },
        });
        if (!parent) {
          this.logger.error(
            `Comment thread integrity error: parent ${currentParentId} not found for comment ${focusedComment.id}`,
          );
          throw new Error('Comment thread integrity error'); // Internal error
        }
        rootCommentId = parent.id;
        currentParentId = parent.parentId;
      }

      // 3. Fetch All Comment IDs in the Thread
      const recursiveQuery = `
        WITH RECURSIVE comment_tree AS (
          -- Anchor: The root comment of the thread
          SELECT c.id, c."parent_id" FROM comments c WHERE c.id = $1
          UNION ALL
          -- Recursive: Children of comments already in the tree
          SELECT c.id, c."parent_id" FROM comments c JOIN comment_tree ct ON c."parent_id" = ct.id
          -- Optional: Add depth limit \`WHERE ct.depth < N\` if needed
        )
        SELECT id FROM comment_tree;
      `;
      const threadCommentIdsResult = await this.commentRepository.query(
        recursiveQuery,
        [rootCommentId],
      );
      const threadCommentIds = threadCommentIdsResult.map((r) => r.id);

      // 4. Fetch All Comment Entities
      let allThreadComments: CommentEntity[] = [];
      if (threadCommentIds.length > 0) {
        allThreadComments = await this.commentRepository.find({
          where: { id: In(threadCommentIds) },
          relations: ['user', 'removedBy'],
        });
      } else {
        throw new NotFoundException('Could not retrieve thread comments.');
      }

      // 5. Fetch User Votes
      const userVotesMap = new Map<string, VoteType>();
      if (currentUserId && threadCommentIds.length > 0) {
        const votes = await this.voteRepository.find({
          where: { userId: currentUserId, commentId: In(threadCommentIds) },
        });
        votes.forEach((v) => userVotesMap.set(v.commentId, v.type));
      }

      // 6. Build Nested Tree & Map to DTOs
      const commentDtoMap = new Map<string, CommentResponseDto>();

      allThreadComments.forEach((comment) => {
        const userDto = comment.user
          ? {
              id: comment.user.id,
              username: comment.user.username,
              displayName: comment.user.displayName,
              avatarUrl: comment.user.avatarUrl,
            }
          : null;
        if (!userDto) {
          this.logger.warn(
            `User data missing for comment ID during thread fetch: ${comment.id}`,
          );
          return;
        }

        commentDtoMap.set(comment.id, {
          id: comment.id,
          content: comment.content, // Handle removed content later
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          voteCount: comment.upvotes - comment.downvotes,
          parentId: comment.parentId,
          user: userDto,
          userVoteType: userVotesMap.get(comment.id) || null,
          isRemoved: !!comment.removedById,
          isEdited: comment.isEdited,
          removedBy:
            comment.removedById && comment.removedBy
              ? {
                  id: comment.removedBy.id,
                  isSelf: comment.removedBy.id === comment.userId,
                }
              : null,
          replies: [],
        });
      });

      // Second pass: Build the tree structure
      commentDtoMap.forEach((commentDto) => {
        if (commentDto.parentId && commentDtoMap.has(commentDto.parentId)) {
          commentDtoMap.get(commentDto.parentId)!.replies!.push(commentDto);
        }
      });

      // 7. Sort Replies Recursively
      const sortCommentDtos = (
        commentsToSort: CommentResponseDto[],
        currentSortBy: string,
      ) => {
        let sortFn: (a: CommentResponseDto, b: CommentResponseDto) => number;
        switch (currentSortBy) {
          case 'old':
            sortFn = (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'new':
          default:
            sortFn = (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
        }
        try {
          commentsToSort.sort(sortFn);
        } catch (e) {
          this.logger.error(`Error sorting thread replies: ${e}`);
          commentsToSort.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
        commentsToSort.forEach((c) => {
          if (c.replies && c.replies.length > 0) {
            sortCommentDtos(c.replies, currentSortBy);
          }
        });
      };

      // Get the root DTO
      const rootCommentDto = commentDtoMap.get(rootCommentId);
      if (!rootCommentDto) {
        this.logger.error(
          `Root comment DTO ${rootCommentId} not found after mapping thread comments.`,
        );
        throw new NotFoundException(
          'Root comment of the thread could not be processed.',
        );
      }

      // Sort the replies starting from the root
      if (rootCommentDto.replies && rootCommentDto.replies.length > 0) {
        sortCommentDtos(rootCommentDto.replies, replySortBy);
      }

      // 8. Final Content Mapping for Removed Comments
      const finalMapContent = (comment: CommentResponseDto) => {
        comment.content =
          comment.isRemoved && comment.removedBy
            ? `Comment removed by ${comment.removedBy.isSelf ? 'user' : 'moderator'}`
            : comment.content;
        if (comment.replies) {
          comment.replies.forEach(finalMapContent);
        }
      };
      finalMapContent(rootCommentDto);

      // 9. Return Result
      return {
        rootComment: rootCommentDto,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find comment thread for ${threadCommentId}:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`An error occurred while fetching the comment thread.`);
    }
  }

  async findOne(id: string): Promise<CommentEntity | null> {
    try {
      return await this.commentRepository.findOne({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }

  async findVote(id: string): Promise<CommentVoteEntity | null> {
    try {
      return await this.voteRepository.findOne({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }
}
