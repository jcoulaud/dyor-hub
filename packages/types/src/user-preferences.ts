export type ChartDisplayMode = 'price' | 'marketCap';

export interface UserPreferences {
  tokenChartDisplay: ChartDisplayMode;
  showWalletAddress: boolean;
}

export const defaultUserPreferences: UserPreferences = {
  tokenChartDisplay: 'price',
  showWalletAddress: false,
};
