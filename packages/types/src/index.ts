export interface Token {
  mintAddress: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  websiteUrl?: string;
  telegramUrl?: string;
  twitterHandle?: string;
  viewsCount: number;
  createdAt: Date;
  lastRefreshedAt?: Date;
}

export interface User {
  id: string;
  twitterId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comments?: Comment[];
  votes?: CommentVote[];
}

export interface Comment {
  id: string;
  tokenMintAddress: string;
  content: string;
  upvotes: number;
  downvotes: number;
  ipHash: string;
  createdAt: Date;
  deletedAt?: Date;
  parentId?: string;
  parent?: Comment;
  replies?: Comment[];
  votes?: CommentVote[];
  user: User;
  userId: string;
}

export type VoteType = 'upvote' | 'downvote';

export interface CommentVote {
  id: string;
  commentId: string;
  comment: Comment;
  userId: string;
  user: User;
  type: VoteType;
  createdAt: Date;
}

export interface CreateCommentDto {
  tokenMintAddress: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface VoteCommentDto {
  type: VoteType;
}
