export interface TokenPurchaseInfo {
  priceUsd: number;
  timestamp: number;
  tokenAmountUi: number;
  spentUsd: number;
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
}

export interface TrackedWalletHolderStats {
  walletAddress: string;
  currentBalanceUi: number;
  currentBalanceRaw: string;
  percentageOfTotalSupply?: number;
  overallAverageBuyPriceUsd: number;
  firstEverPurchase: TokenPurchaseInfo | null;
  purchaseRounds: TrackedWalletPurchaseRound[];
  lastSellOffTimestamp?: number;
  currentHoldingDurationSeconds?: number;
}
