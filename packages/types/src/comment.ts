import { User } from './user';
import { VoteType } from './vote';

export const COMMENT_MAX_LENGTH = 10_000;

export interface Comment {
  id: string;
  content: string;
  tokenMintAddress: string;
  upvotes: number;
  downvotes: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  userVoteType: VoteType | null;
  isRemoved: boolean;
  removedBy: {
    id: string;
    isSelf: boolean;
  } | null;
  replies?: Comment[];
}

export interface LatestComment {
  id: string;
  content: string;
  createdAt: string;
  token: {
    tokenMintAddress: string;
    symbol: string;
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    username?: string;
  };
}

export interface CreateCommentDto {
  /** @maxLength {COMMENT_MAX_LENGTH} The content of the comment */
  content: string;
  tokenMintAddress: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  /** @maxLength {COMMENT_MAX_LENGTH} The content of the comment */
  content: string;
}
