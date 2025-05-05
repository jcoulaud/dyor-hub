import { UserActivity } from '@dyor-hub/types';
import { Expose, Transform } from 'class-transformer';
import { CommentVoteEntity } from '../../entities/comment-vote.entity';
import { CommentEntity } from '../../entities/comment.entity';

export class UserActivityDto implements UserActivity {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  tokenMintAddress: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: string;

  @Expose()
  upvotes: number;

  @Expose()
  downvotes: number;

  @Expose()
  tokenSymbol: string;

  @Expose()
  tokenName: string;

  @Expose()
  isReply: boolean;

  @Expose()
  isUpvote?: boolean;

  @Expose()
  isDownvote?: boolean;

  @Expose()
  parentCommentId: string | null;

  @Expose()
  isRemoved?: boolean;

  constructor(partial: Partial<UserActivityDto>) {
    Object.assign(this, partial);
  }

  static fromComment(
    comment: CommentEntity,
    tokenSymbol?: string,
    tokenName?: string,
  ): UserActivityDto {
    return new UserActivityDto({
      id: comment.id,
      content: comment.content,
      tokenMintAddress: comment.tokenMintAddress,
      createdAt: comment.createdAt.toISOString(),
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      tokenSymbol: tokenSymbol || '',
      tokenName: tokenName || '',
      isReply: Boolean(comment.parentId),
      parentCommentId: comment.parentId,
      isRemoved: Boolean(comment.removedById),
    });
  }

  static fromVote(
    vote: CommentVoteEntity,
    comment: CommentEntity,
    tokenSymbol?: string,
    tokenName?: string,
  ): UserActivityDto {
    return new UserActivityDto({
      id: vote.id,
      content: comment.content,
      tokenMintAddress: comment.tokenMintAddress,
      createdAt: vote.createdAt.toISOString(),
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      tokenSymbol: tokenSymbol || '',
      tokenName: tokenName || '',
      isReply: Boolean(comment.parentId),
      isUpvote: vote.type === 'upvote',
      isDownvote: vote.type === 'downvote',
      parentCommentId: comment.parentId,
      isRemoved: Boolean(comment.removedById),
    });
  }
}
