import { UserPreferences } from './user-preferences';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
  preferences?: Partial<UserPreferences>;
  primaryWalletAddress?: string;
  createdAt: string;
  followersCount?: number;
  followingCount?: number;
  createdTokens?: { mintAddress: string; symbol: string }[];
}

export interface UserProfile extends User {
  twitterId?: string;
  twitterAccessToken?: string;
  twitterRefreshToken?: string;
  preferences?: Record<string, any>;
}

export interface UserStats {
  comments: number;
  replies: number;
  upvotes: number;
  downvotes: number;
  currentStreak?: number;
  longestStreak?: number;
  reputation?: number;
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

export interface UserMinimum {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export enum ActivityType {
  COMMENT = 'comment',
  POST = 'post',
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  LOGIN = 'login',
  PREDICTION = 'prediction',
  REFERRAL_SUCCESS = 'referral_success',
}

export interface UserFollows {
  followerId: string;
  followedId: string;
  notify_on_prediction: boolean;
  notify_on_comment: boolean;
  notify_on_vote: boolean;
  created_at: string;
}
