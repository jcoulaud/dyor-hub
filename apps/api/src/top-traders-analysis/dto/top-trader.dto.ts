export interface TopTrader {
  wallet: string;
  held: number;
  sold: number;
  holding: number;
  realized: number;
  unrealized: number;
  total: number;
  total_invested: number;
}

export interface TopTradersResponse {
  traders: TopTrader[];
  tokenAddress: string;
  totalTraders: number;
}
