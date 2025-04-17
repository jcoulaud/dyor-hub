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

export enum SentimentType {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  RED_FLAG = 'redFlag',
}

export interface TokenSentiment {
  id: string;
  tokenMintAddress: string;
  sentimentType: SentimentType;
  value: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenSentimentStats {
  bullishCount: number;
  bearishCount: number;
  redFlagCount: number;
  userSentiment?: SentimentType;
  totalCount: number;
}

export interface TokenHolder {
  address: string;
  amount: number;
  percentage: number;
}

export interface TokenStats {
  // Market data
  price?: number;
  marketCap?: number;
  volume24h?: number;

  // Supply information
  totalSupply: string;
  circulatingSupply: string;

  // Holder information
  topHolders?: TokenHolder[];

  // Last updated timestamp
  lastUpdated: Date;
}

export interface TwitterUsernameHistory {
  last_checked: string;
  username: string;
}

export interface TwitterUsernameHistoryEntity {
  id: string;
  tokenMintAddress: string;
  twitterUsername: string;
  history: TwitterUsernameHistory[] | null;
  createdAt: Date;
}

export interface TokenMinimum {
  mintAddress: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
}

export interface PaginatedTokensResponse {
  data: Token[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HotTokenResult {
  mintAddress: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  commentCount: number;
}
