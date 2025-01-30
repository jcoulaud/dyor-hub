import { VoteType } from '@dyor-hub/types';
import { CommentEntity } from '../entities/comment.entity';

export type CommentWithVoteType = CommentEntity & {
  userVoteType: VoteType | null;
};
