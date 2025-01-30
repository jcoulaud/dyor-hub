import { VoteType } from '@dyor-hub/types';

export class VoteResponseDto {
  upvotes: number;
  downvotes: number;
  userVoteType: VoteType | null;
}
