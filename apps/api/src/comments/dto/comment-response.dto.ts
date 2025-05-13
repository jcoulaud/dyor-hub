import { CommentType, TokenCallStatus, VoteType } from '@dyor-hub/types';
import { Expose, Type } from 'class-transformer';
import { UserDto } from '../../token-calls/dto/user.dto';

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

class TokenCallDetailsDto {
  @Expose()
  id: string;

  @Expose()
  targetPrice: number;

  @Expose()
  targetDate: string;

  @Expose()
  status: TokenCallStatus;

  @Expose()
  referencePrice: number;

  @Expose()
  referenceSupply?: number | null;
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
  type: CommentType;

  @Expose()
  tokenCallId: string | null;

  @Expose()
  @Type(() => TokenCallDetailsDto)
  tokenCall: TokenCallDetailsDto | null;

  @Expose()
  @Type(() => RemovedByDto)
  removedBy: RemovedByDto | null;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  @Type(() => CommentResponseDto)
  replies?: CommentResponseDto[];

  @Expose()
  marketCapAtCreation?: number | null;
}
