export interface BirdeyeTokenExtensionDto {
  twitter?: string;
  telegram?: string;
  website?: string;
  [key: string]: any;
}

export interface BirdeyeTokenDto {
  address: string;
  decimals: number;
  logo_uri: string | null;
  name: string;
  symbol: string;
  extensions?: BirdeyeTokenExtensionDto;
  market_cap?: number;
  fdv?: number;
  liquidity?: number;
  last_trade_unix_time?: number;
  volume_1h_usd?: number;
  volume_1h_change_percent?: number;
  volume_4h_usd?: number;
  volume_4h_change_percent?: number;
  volume_24h_usd?: number;
  volume_24h_change_percent?: number;
  price?: number;
  price_change_1h_percent?: number;
  price_change_4h_percent?: number;
  price_change_24h_percent?: number;
  holder?: number;
  recent_listing_time?: number;
}
