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
import { UserEntity } from '../entities/user.entity';
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
  ): Promise<CommentEntity[]> {
    return this.commentRepository.find({
      where: { tokenMintAddress },
      relations: ['user', 'votes', 'votes.user'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async create(
    createCommentDto: CreateCommentDto,
    user: UserEntity,
  ): Promise<CommentEntity> {
    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      tokenMintAddress: createCommentDto.tokenMintAddress,
      user,
    });

    return this.commentRepository.save(comment);
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
    user: UserEntity,
  ): Promise<CommentVoteEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['votes'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Remove existing vote if any
    await this.voteRepository.delete({
      comment: { id: commentId },
      user: { id: user.id },
    });

    // Create new vote
    const vote = this.voteRepository.create({
      type,
      comment,
      user,
    });

    return this.voteRepository.save(vote);
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
