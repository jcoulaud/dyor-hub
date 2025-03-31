export interface UserSettings {
  tokenChartDisplay: ChartDisplayMode;
}

export type ChartDisplayMode = 'price' | 'marketCap';

// Default settings to use when creating a new user
export const defaultUserSettings: UserSettings = {
  tokenChartDisplay: 'price',
};
