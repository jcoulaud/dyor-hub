import { VoteType } from '@dyor-hub/types';
import { IsIn } from 'class-validator';

export class VoteCommentDto {
  @IsIn(['upvote', 'downvote'])
  type: VoteType;
}
