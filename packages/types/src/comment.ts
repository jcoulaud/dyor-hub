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
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  userVoteType: VoteType | null;
  voteCount?: number;
}
