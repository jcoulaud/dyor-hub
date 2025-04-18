import { VoteType } from '@dyor-hub/types';
import { Expose, Type } from 'class-transformer';

class CommentUserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl: string;
}

class RemovedByDto {
  @Expose()
  id: string;

  @Expose()
  isSelf: boolean;
}

export class CommentResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt?: Date;

  @Expose()
  voteCount: number;

  @Expose()
  parentId: string | null;

  @Expose()
  userVoteType: VoteType | null;

  @Expose()
  isRemoved: boolean;

  @Expose()
  isEdited: boolean;

  @Expose()
  @Type(() => RemovedByDto)
  removedBy: RemovedByDto | null;

  @Expose()
  @Type(() => CommentUserDto)
  user: CommentUserDto;

  @Expose()
  @Type(() => CommentResponseDto)
  replies?: CommentResponseDto[];
}
