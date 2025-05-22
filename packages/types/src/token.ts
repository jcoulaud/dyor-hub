import { User } from './user';

export interface Token {
  id?: string;
  mintAddress: string;
  name: string;
  symbol: string;
  description?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  telegramUrl?: string | null;
  twitterHandle?: string | null;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
  verifiedCreatorUserId?: string | null;
  verifiedCreatorUser?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null;
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
  price?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  volume24hChangePercent?: number | null;
  buyCount24h?: number | null;
  sellCount24h?: number | null;
  uniqueWallets24h?: number | null;
  holders?: number | null;
  totalSupply?: string | null;
  circulatingSupply?: string | null;
  topHolders: TokenHolder[];
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
  imageUrl: string | null;
  commentCount: number;
}

export interface PaginatedHotTokensResult {
  items: HotTokenResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Trench Bundle API Types

export interface TrenchBundleWalletInfo {
  sol: number;
  sol_percentage: number;
  token_percentage: number;
  tokens: number;
}

export interface TrenchBundleAnalysis {
  category_breakdown: Record<string, number>;
  is_likely_bundle: boolean;
  primary_category: string;
}

export interface TrenchBundle {
  bundle_analysis: TrenchBundleAnalysis;
  holding_amount: number;
  holding_percentage: number;
  token_percentage: number;
  total_sol: number;
  total_tokens: number;
  unique_wallets: number;
  wallet_categories: Record<string, string>;
  wallet_info: Record<string, TrenchBundleWalletInfo>;
}

export interface TrenchCreatorCoinHistory {
  created_at: number;
  is_rug: boolean;
  market_cap: number;
  mint: string;
  symbol: string;
}

export interface TrenchCreatorHistory {
  average_market_cap: number;
  high_risk: boolean;
  previous_coins: TrenchCreatorCoinHistory[];
  recent_rugs: number;
  rug_count: number;
  rug_percentage: number;
  total_coins_created: number;
}

export interface TrenchCreatorAnalysis {
  address: string;
  current_holdings: number;
  history: TrenchCreatorHistory;
  holding_percentage: number;
  risk_level: string;
  warning_flags: (string | null)[];
}

// Raw API response structure from Trench
export interface TrenchBundleApiResponse {
  bonded: boolean;
  bundles: Record<string, TrenchBundle>; // Bundle ID -> Bundle details
  creator_analysis: TrenchCreatorAnalysis;
  distributed_amount: number;
  distributed_percentage: number;
  distributed_wallets: number;
  ticker: string;
  total_bundles: number;
  total_holding_amount: number;
  total_holding_percentage: number;
  total_percentage_bundled: number;
  total_sol_spent: number;
  total_tokens_bundled: number;
}

// Single bundle structure after processing (includes ID)
export interface SingleBundleData extends TrenchBundle {
  id: string;
}

// Overall structure after processing (bundles is an array)
export interface ProcessedBundleData extends Omit<TrenchBundleApiResponse, 'bundles'> {
  bundles: SingleBundleData[];
}

export interface EarlyBuyerWallet {
  address: string;
  isHolding: boolean;
  purchaseTxSignature?: string;
  rank: number;
}

export interface EarlyBuyerInfo {
  tokenMintAddress: string;
  totalEarlyBuyersCount: number;
  stillHoldingCount: number;
  earlyBuyers: EarlyBuyerWallet[];
  lastChecked: string;
}

export interface HolderScanDelta {
  holder: string;
  delta: number;
  amount: number;
}

export interface SolanaTrackerHolderDataPoint {
  holders: number;
  time: number;
}

export interface SolanaTrackerHoldersChartResponse {
  holders: SolanaTrackerHolderDataPoint[];
}
