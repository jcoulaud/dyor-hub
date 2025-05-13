import { TokenCallStatus } from './token-call';
import { User } from './user';
import { VoteType } from './vote';

export const COMMENT_MAX_LENGTH = 10_000;

export enum CommentType {
  COMMENT = 'comment',
  TOKEN_CALL_EXPLANATION = 'token_call_explanation',
}

export interface TokenCallDetails {
  id: string;
  targetPrice: number;
  targetDate: string;
  status: TokenCallStatus;
  referencePrice: number;
  referenceSupply?: number | null;
}

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
  isEdited: boolean;
  type: CommentType;
  tokenCallId: string | null;
  tokenCall?: TokenCallDetails | null;
  removedBy: {
    id: string;
    isSelf: boolean;
  } | null;
  replies?: Comment[];
  marketCapAtCreation?: number | null;
}

export interface LatestComment {
  id: string;
  content: string;
  createdAt: string;
  marketCapAtCreation?: number | null;
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

export interface PaginatedLatestCommentsResponse {
  data: LatestComment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
