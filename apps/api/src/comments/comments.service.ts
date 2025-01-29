import { UpdateCommentDto, VoteType } from '@dyor-hub/types';
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly voteRepository: Repository<CommentVoteEntity>,
  ) {}

  async findByTokenMintAddress(
    tokenMintAddress: string,
    currentUserId?: string,
  ): Promise<CommentEntity[]> {
    const query = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .select([
        'comment.id',
        'comment.content',
        'comment.tokenMintAddress',
        'comment.upvotes',
        'comment.downvotes',
        'comment.createdAt',
        'comment.updatedAt',
        'comment.deletedAt',
        'comment.parentId',
        'user.id',
        'user.displayName',
        'user.username',
        'user.avatarUrl',
      ])
      .where('comment.tokenMintAddress = :tokenMintAddress', {
        tokenMintAddress,
      });

    // Only get current user's vote if they're authenticated
    if (currentUserId) {
      query.leftJoinAndSelect(
        'comment.votes',
        'vote',
        'vote.userId = :currentUserId',
        { currentUserId },
      );
    }

    const comments = await query.orderBy('comment.createdAt', 'DESC').getMany();

    // Transform the response to include only the current user's vote
    return comments.map((comment) => {
      const entity = new CommentEntity();
      Object.assign(entity, {
        ...comment,
        votes: comment.votes ? [comment.votes[0]].filter(Boolean) : [], // Only include the current user's vote if it exists
      });
      return entity;
    });
  }

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    if (!userId) {
      throw new UnauthorizedException('Invalid user data');
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

    // Load the comment with user data
    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== userId) {
      throw new UnauthorizedException('Not authorized to update this comment');
    }

    comment.content = dto.content;
    return this.commentRepository.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user'],
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
    type: VoteType,
    userId: string,
  ): Promise<{
    id: string;
    type: VoteType | null;
    upvotes: number;
    downvotes: number;
    userId: string;
  }> {
    // Get the comment with its current vote counts
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['votes'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Find existing vote by userId
    const existingVote = await this.voteRepository.findOne({
      where: {
        commentId: commentId,
        userId: userId,
      },
      relations: ['comment'],
    });

    // If user has already voted with the same type, remove the vote (toggle off)
    if (existingVote && existingVote.type === type) {
      await this.voteRepository.remove(existingVote);

      // Update comment vote counts
      if (type === 'upvote') {
        comment.upvotes = Math.max(0, comment.upvotes - 1);
      } else {
        comment.downvotes = Math.max(0, comment.downvotes - 1);
      }
      await this.commentRepository.save(comment);

      return {
        id: commentId,
        type: null,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        userId,
      };
    }

    // Remove existing vote if any (different type)
    if (existingVote) {
      // Update comment vote counts for the old vote
      if (existingVote.type === 'upvote') {
        comment.upvotes = Math.max(0, comment.upvotes - 1);
      } else {
        comment.downvotes = Math.max(0, comment.downvotes - 1);
      }
      await this.voteRepository.remove(existingVote);
    }

    // Create new vote and update counts
    const vote = this.voteRepository.create({
      type,
      comment,
      commentId: comment.id,
      userId,
    });
    await this.voteRepository.save(vote);

    // Update comment vote counts for the new vote
    if (type === 'upvote') {
      comment.upvotes += 1;
    } else {
      comment.downvotes += 1;
    }
    await this.commentRepository.save(comment);

    return {
      id: commentId,
      type,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      userId,
    };
  }

  async getVoteCount(
    commentId: string,
  ): Promise<{ upvotes: number; downvotes: number }> {
    const votes = await this.voteRepository.find({
      where: {
        comment: { id: commentId },
      },
      relations: ['comment'],
    });

    return {
      upvotes: votes.filter((v) => v.type === 'upvote').length,
      downvotes: votes.filter((v) => v.type === 'downvote').length,
    };
  }
}
