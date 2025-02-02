import { VoteType } from '@dyor-hub/types';
import { Expose, Type } from 'class-transformer';

class CommentUserDto {
  @Expose()
  id: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl: string;
}

export class CommentResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  createdAt: Date;

  @Expose()
  voteCount: number;

  @Expose()
  parentId: string | null;

  @Expose()
  @Type(() => CommentUserDto)
  user: CommentUserDto;

  @Expose()
  userVoteType: VoteType | null;
}
