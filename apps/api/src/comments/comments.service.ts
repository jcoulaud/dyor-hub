import { UpdateCommentDto, VoteType } from '@dyor-hub/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { PerspectiveService } from '../services/perspective.service';
import { TelegramNotificationService } from '../services/telegram-notification.service';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { LatestCommentResponseDto } from './dto/latest-comment-response.dto';
import { VoteResponseDto } from './dto/vote-response.dto';

@Injectable()
export class CommentsService {
  // Edit window duration for a comment
  private readonly EDIT_WINDOW_MS = 15 * 60 * 1000;

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly voteRepository: Repository<CommentVoteEntity>,
    private readonly perspectiveService: PerspectiveService,
    private readonly telegramService: TelegramNotificationService,
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
      const total = await this.commentRepository.count({
        where: { tokenMintAddress },
      });

      let dbOrderBy: any;

      switch (sortBy) {
        case 'new':
          dbOrderBy = { createdAt: 'DESC' };
          break;
        case 'old':
          dbOrderBy = { createdAt: 'ASC' };
          break;
        default:
          dbOrderBy = { createdAt: 'DESC' };
      }

      const shouldFetchAll = ['best', 'controversial'].includes(sortBy);

      const commentsQuery = this.commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('comment.removedBy', 'removedBy')
        .where('comment.tokenMintAddress = :tokenMintAddress', {
          tokenMintAddress,
        })
        .orderBy(
          dbOrderBy.createdAt === 'ASC'
            ? 'comment.createdAt'
            : 'comment.createdAt',
          dbOrderBy.createdAt === 'ASC' ? 'ASC' : 'DESC',
        );

      let comments: CommentEntity[];

      if (shouldFetchAll) {
        const maxCommentsToFetch = Math.min(500, total);
        comments = await commentsQuery.take(maxCommentsToFetch).getMany();
      } else {
        comments = await commentsQuery
          .skip((page - 1) * limit)
          .take(limit)
          .getMany();
      }

      if (sortBy === 'best') {
        comments.sort(
          (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes),
        );
      } else if (sortBy === 'controversial') {
        comments.sort((a, b) => {
          // First prioritize comments with negative scores
          const aScore = a.upvotes - a.downvotes;
          const bScore = b.upvotes - b.downvotes;

          // Negative scores are most controversial, they come first
          if (aScore < 0 && bScore >= 0) return -1;
          if (aScore >= 0 && bScore < 0) return 1;

          // Then examine the controversy ratio
          const aTotalVotes = a.upvotes + a.downvotes;
          const bTotalVotes = b.upvotes + b.downvotes;

          // Skip division if no votes
          if (aTotalVotes === 0 && bTotalVotes === 0) return 0;
          if (aTotalVotes === 0) return 1;
          if (bTotalVotes === 0) return -1;

          // Calculate how controversial (closer to 50/50 ratio is more controversial)
          const aControversy = Math.min(a.upvotes, a.downvotes) / aTotalVotes;
          const bControversy = Math.min(b.upvotes, b.downvotes) / bTotalVotes;

          // Higher controversy value (closer to 0.5) comes first
          if (aControversy !== bControversy) {
            return bControversy - aControversy;
          }

          // If equally controversial, more votes wins
          return bTotalVotes - aTotalVotes;
        });
      }

      const paginatedComments = shouldFetchAll
        ? comments.slice((page - 1) * limit, page * limit)
        : comments;

      // Fetch user votes if applicable
      const userVotes =
        currentUserId && paginatedComments.length > 0
          ? await this.voteRepository.find({
              where: {
                userId: currentUserId,
                commentId: In(paginatedComments.map((c) => c.id)),
              },
            })
          : [];

      return {
        data: paginatedComments.map((comment) => {
          const userVote = userVotes.find((v) => v.commentId === comment.id);

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
        }),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
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
    if (!userId) {
      throw new UnauthorizedException('Invalid user data');
    }

    // Validate content with content moderation API
    const contentAnalysis = await this.perspectiveService.analyzeText(
      createCommentDto.content,
    );

    if (contentAnalysis.isSpam) {
      throw new BadRequestException('This comment has been detected as spam');
    }

    if (contentAnalysis.isToxic) {
      throw new BadRequestException(
        'This comment contains inappropriate content',
      );
    }

    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      tokenMintAddress: createCommentDto.tokenMintAddress,
      parentId: createCommentDto.parentId,
      userId,
      upvotes: 0,
      downvotes: 0,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Get comment with user relationship populated
    const populatedComment = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: {
        user: true,
        token: true,
      },
    });

    // Notify admins via Telegram about the new comment
    this.telegramService.notifyNewComment(populatedComment);

    return populatedComment;
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
      relations: {
        votes: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
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

  private sanitizeHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
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
      content: this.sanitizeHtml(comment.content),
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
    commentId: string,
    currentUserId?: string,
  ): Promise<{
    rootComment: CommentResponseDto;
    comments: CommentResponseDto[];
    focusedCommentId: string;
  }> {
    const focusedComment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'removedBy'],
    });

    if (!focusedComment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Find the root comment
    let rootCommentId = commentId;
    if (focusedComment.parentId) {
      let currentParentId = focusedComment.parentId;

      while (currentParentId) {
        const parentComment = await this.commentRepository.findOne({
          where: { id: currentParentId },
        });

        if (!parentComment) break;

        rootCommentId = parentComment.id;

        if (!parentComment.parentId) {
          break;
        }

        currentParentId = parentComment.parentId;
      }
    }

    // Fetch all comments in thread
    const threadComments = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.removedBy', 'removedBy')
      .where('comment.id = :rootId', { rootId: rootCommentId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('c.id')
          .from(CommentEntity, 'c')
          .where('c.id = :rootId', { rootId: rootCommentId })
          .getQuery();
        return `comment.parentId IN ${subQuery} OR comment.id IN ${subQuery}`;
      })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('c.id')
          .from(CommentEntity, 'c')
          .where('c.parentId = :rootId', { rootId: rootCommentId })
          .getQuery();
        return `comment.parentId IN ${subQuery}`;
      })
      .getMany();

    // Get user votes
    let userVotes: CommentVoteEntity[] = [];
    if (currentUserId && threadComments.length > 0) {
      userVotes = await this.voteRepository.find({
        where: {
          userId: currentUserId,
          commentId: In(threadComments.map((c) => c.id)),
        },
      });
    }

    const createCommentDTO = (comment: CommentEntity) => {
      const userVote = userVotes.find((v) => v.commentId === comment.id);

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
    };

    // Find the root comment from the fetched comments
    const rootComment = threadComments.find((c) => c.id === rootCommentId);

    if (!rootComment) {
      throw new NotFoundException(
        `Root comment with ID ${rootCommentId} not found`,
      );
    }

    const commentDTOs = threadComments.map(createCommentDTO);
    const rootCommentDTO = createCommentDTO(rootComment);

    return {
      rootComment: rootCommentDTO,
      comments: commentDTOs,
      focusedCommentId: commentId,
    };
  }
}
