export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface UserProfile extends User {
  twitterId?: string;
  twitterAccessToken?: string;
  twitterRefreshToken?: string;
}

export interface UserStats {
  comments: number;
  replies: number;
  upvotes: number;
  downvotes: number;
}

export interface UserActivity {
  id: string;
  content: string;
  tokenMintAddress: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  tokenSymbol: string;
  isReply: boolean;
  isUpvote?: boolean;
  isDownvote?: boolean;
  parentCommentId: string | null;
  isRemoved?: boolean;
}
