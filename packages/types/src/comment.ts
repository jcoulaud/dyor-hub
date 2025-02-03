import { User } from './user';
import { VoteType } from './vote';

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

export interface CreateCommentDto {
  content: string;
  tokenMintAddress: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}
