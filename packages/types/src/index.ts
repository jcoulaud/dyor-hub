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

export interface Comment {
  id: string;
  tokenMintAddress: string;
  content: string;
  upvotes: number;
  downvotes: number;
  ipHash: string;
  createdAt: Date;
  votes?: CommentVote[];
}

export interface CommentVote {
  id: string;
  commentId: string;
  ipHash: string;
  isUpvote: boolean;
  createdAt: Date;
}
