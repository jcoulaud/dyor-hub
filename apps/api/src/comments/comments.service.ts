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
import { VoteResponseDto } from './dto/vote-response.dto';
import { CommentWithVoteType } from './types';

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
  ): Promise<CommentWithVoteType[]> {
    const query = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user');

    // Add subquery to get current user's vote type
    if (currentUserId) {
      query
        .leftJoin(
          CommentVoteEntity,
          'vote',
          'vote.comment_id = comment.id AND vote.user_id = :currentUserId',
          { currentUserId },
        )
        .addSelect('vote.type', 'userVoteType');
    }

    query
      .where('comment.token_mint_address = :tokenMintAddress', {
        tokenMintAddress,
      })
      .orderBy('comment.created_at', 'DESC');

    const [entities, raw] = await Promise.all([
      query.getMany(),
      query.getRawMany(),
    ]);

    // Map the raw results to get userVoteType
    const voteTypeMap = new Map(
      raw.map((item) => [item.comment_id, item.userVoteType]),
    );

    // Combine entities with userVoteType
    return entities.map((comment) => ({
      ...comment,
      userVoteType: voteTypeMap.get(comment.id) || null,
    }));
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
    userId: string,
    type: VoteType,
  ): Promise<VoteResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['votes'],
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
      relations: ['comment'],
    });

    return {
      upvotes: votes.filter((v) => v.type === 'upvote').length,
      downvotes: votes.filter((v) => v.type === 'downvote').length,
    };
  }
}
