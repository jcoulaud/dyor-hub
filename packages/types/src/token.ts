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
  circulatingSupply?: string;

  // Holder information
  topHolders?: TokenHolder[];

  // Last updated timestamp
  lastUpdated: Date;
}
