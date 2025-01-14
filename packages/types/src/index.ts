export interface TokenEntity {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  createdAt: string;
  owner: string;
  metadata?: {
    image?: string;
    description?: string;
  };
}

export interface TokenMarketData {
  priceUsd: number;
  priceSol: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  uniqueTraders24h?: number;
  buyCount24h?: number;
  sellCount24h?: number;
}

export interface TokenSecurity {
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  isLpBurned: boolean;
  isBundled?: boolean;
  bundleImpact?: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
}

export interface Token {
  mintAddress: string;
  name: string;
  symbol: string;
  totalSupply: string;
  websiteUrl?: string;
  telegramUrl?: string;
  twitterHandle?: string;
  twitterHistory?: TwitterHistoryEntry[];
  createdAt: Date;
  caDeployer: string;
  lpCreator: string;
  viewsCount: number;
  firstViewedAt: Date;
  lastViewedAt: Date;
}

export interface TwitterHistoryEntry {
  username: string;
  changedAt: Date;
}

export interface Comment {
  id: string;
  tokenMintAddress: string;
  content: string;
  voteCount: number;
  ipHash: string;
  createdAt: Date;
}
