export interface TokenPurchaseInfo {
  priceUsd: number;
  timestamp: number;
  tokenAmountUi: number;
  spentUsd: number;
  approxMarketCapAtPurchaseUsd?: number;
  txHash?: string;
}

export interface TrackedWalletPurchaseRound {
  roundId: number;
  firstPurchaseInRound: TokenPurchaseInfo;
  subsequentPurchasesInRound: TokenPurchaseInfo[];
  totalTokensBoughtUi: number;
  totalUsdSpent: number;
  averageBuyPriceUsd: number;
  startTime: number;
  endTime?: number;
  soldAmountUi: number;
  soldEverythingFromRound: boolean;
  holdingDurationSeconds?: number;
  realizedPnlUsd?: number;
}

export interface TrackedWalletHolderStats {
  walletAddress: string;
  currentBalanceUi: number;
  currentBalanceRaw: string;
  percentageOfTotalSupply?: number;
  overallAverageBuyPriceUsd: number;
  firstEverPurchase: TokenPurchaseInfo | null;
  totalUsdValueOfSales?: number;
  overallRealizedPnlUsd?: number;
  analyzedTokenTotalSupply?: number;
  purchaseRounds: TrackedWalletPurchaseRound[];
  lastSellOffTimestamp?: number;
  currentHoldingDurationSeconds?: number;
}

export type WalletAnalysisCount = 10 | 20 | 50;

export interface TokenHolderAnalysisParams {
  walletCount?: WalletAnalysisCount;
  sessionId?: string;
}
