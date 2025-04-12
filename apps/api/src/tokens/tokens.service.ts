import { TokenHolder, TokenStats } from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';
import { WatchlistService } from '../watchlist/watchlist.service';
import { TwitterHistoryService } from './twitter-history.service';

interface BirdeyeTokenOverviewExtensions {
  coingeckoId?: string | null;
  serumV3Usdc?: string | null;
  serumV3Usdt?: string | null;
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  description?: string | null;
  discord?: string | null;
  medium?: string | null;
  [key: string]: any;
}

interface BirdeyeTokenOverviewData {
  address?: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  extensions?: BirdeyeTokenOverviewExtensions;
  logoURI?: string;
  liquidity?: number;
  lastTradeUnixTime?: number;
  price?: number;
  priceChange24hPercent?: number;
  totalSupply?: number;
  fdv?: number;
  marketCap?: number;
  circulatingSupply?: number;
  holder?: number;
  v24hUSD?: number;
  [key: string]: any;
}

interface BirdeyeTokenOverviewResponse {
  data?: BirdeyeTokenOverviewData;
  success?: boolean;
}

interface BirdeyeV3HolderItem {
  amount: string;
  decimals: number;
  mint: string;
  owner: string;
  token_account: string;
  ui_amount: number;
}

interface BirdeyeV3HolderResponse {
  data?: {
    items?: BirdeyeV3HolderItem[];
  };
  success?: boolean;
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly tokenOverviewCache: Map<string, any> = new Map();
  private readonly topHoldersCache: Map<string, any> = new Map();
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly cacheTimestamps: Map<string, number> = new Map();

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly configService: ConfigService,
    private readonly twitterHistoryService: TwitterHistoryService,
    private readonly watchlistService?: WatchlistService,
  ) {}

  /**
   * Fetches Birdeye Token Overview with caching
   */
  public async fetchTokenOverview(
    mintAddress: string,
  ): Promise<BirdeyeTokenOverviewResponse['data'] | null> {
    const cacheKey = `token_overview_${mintAddress}`;
    const cachedData = this.tokenOverviewCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);
    const BIRD_CACHE_TTL = 60 * 1000;

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < BIRD_CACHE_TTL
    ) {
      return cachedData;
    }

    // Request Deduplication
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      const apiUrl = `https://public-api.birdeye.so/defi/token_overview?address=${mintAddress}`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            'X-API-KEY': this.configService.get('BIRDEYE_API_KEY') || '',
            'x-chain': 'solana',
          },
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to parse error JSON' }));
          const errorMessage = errorData?.message || response.statusText;
          throw new Error(
            `Birdeye API error (${response.status}): ${errorMessage}`,
          );
        }

        const data: BirdeyeTokenOverviewResponse = await response.json();

        if (!data?.success || !data?.data) {
          this.logger.warn(
            `Birdeye overview response unsuccessful or missing data for ${mintAddress}`,
          );
          return null;
        }

        // Cache the data.data part
        this.tokenOverviewCache.set(cacheKey, data.data);
        this.cacheTimestamps.set(cacheKey, Date.now());
        this.logger.debug(`Cached Birdeye overview for ${mintAddress}`);

        return data.data;
      } catch (error) {
        this.logger.error(
          `Error fetching Birdeye token overview for ${mintAddress}:`,
          error.message,
        );
        return null; // Return null on error
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async getTokenData(
    mintAddress: string,
    userId?: string,
  ): Promise<TokenEntity & { isWatchlisted?: boolean }> {
    try {
      let token = await this.tokenRepository.findOne({
        where: { mintAddress },
      });

      if (!token) {
        const overviewData = await this.fetchTokenOverview(mintAddress);

        if (!overviewData || (!overviewData.name && !overviewData.symbol)) {
          throw new NotFoundException(
            `Token ${mintAddress} not found via Birdeye overview or missing essential info.`,
          );
        }

        let twitterHandle = null;
        if (overviewData.extensions?.twitter) {
          twitterHandle = overviewData.extensions.twitter
            .replace('https://x.com/', '')
            .replace('https://twitter.com/', '')
            .replace('@', '');
        }

        const baseTokenData: Partial<TokenEntity> = {
          mintAddress: overviewData.address || mintAddress,
          name: overviewData.name,
          symbol: overviewData.symbol,
          description: overviewData.extensions?.description,
          imageUrl: overviewData.logoURI,
          websiteUrl: overviewData.extensions?.website,
          telegramUrl: overviewData.extensions?.telegram,
          twitterHandle: twitterHandle,
          viewsCount: 1, // First view
        };

        const newToken = this.tokenRepository.create(baseTokenData);
        token = await this.tokenRepository.save(newToken);

        // Fetch Twitter username history if available
        if (token.twitterHandle) {
          await this.twitterHistoryService.fetchAndStoreUsernameHistory(token);
        }
      } else {
        // Existing token: Track view count
        token.viewsCount = (token.viewsCount || 0) + 1;
        await this.tokenRepository.save(token);
      }

      // Add watchlist status if user is authenticated
      if (userId && this.watchlistService) {
        const isWatchlisted = await this.watchlistService.isTokenInWatchlist(
          userId,
          mintAddress,
        );
        return { ...token, isWatchlisted };
      }

      return token;
    } catch (error) {
      this.logger.error(`Error in getTokenData for ${mintAddress}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to get token data for ${mintAddress}.`,
      );
    }
  }

  /**
   * Clears all API data caches
   */
  public clearCaches() {
    this.tokenOverviewCache.clear();
    this.topHoldersCache.clear();
    this.cacheTimestamps.clear();
    this.pendingRequests.clear();
  }

  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokenRepository.find();
  }

  async getTokens(mintAddresses: string[]): Promise<TokenEntity[]> {
    return this.tokenRepository.find({
      where: { mintAddress: In(mintAddresses) },
    });
  }

  async getTokenStats(mintAddress: string): Promise<TokenStats> {
    try {
      const tokenExists = await this.tokenRepository.findOne({
        where: { mintAddress: mintAddress },
        select: ['mintAddress'],
      });
      if (!tokenExists) {
        throw new NotFoundException(
          `Token with mint address ${mintAddress} not found in DB for stats`,
        );
      }
      const overviewData = await this.fetchTokenOverview(mintAddress);
      if (!overviewData) {
        throw new InternalServerErrorException(
          `Could not fetch overview data from Birdeye for token ${mintAddress}.`,
        );
      }

      const topHolders = await this.fetchTopHolders(mintAddress, overviewData);

      const decimals = overviewData.decimals ?? 0;
      const rawTotalSupply = overviewData.totalSupply ?? 0;
      const rawCirculatingSupply =
        overviewData.circulatingSupply ?? overviewData.totalSupply ?? 0; // Fallback circ to total

      const calculatedTotalSupply =
        rawTotalSupply > 0 && decimals >= 0
          ? rawTotalSupply / Math.pow(10, decimals)
          : 0;
      const calculatedCirculatingSupply =
        rawCirculatingSupply > 0 && decimals >= 0
          ? rawCirculatingSupply / Math.pow(10, decimals)
          : 0;

      const totalSupplyString = calculatedTotalSupply.toString();
      const circulatingSupplyString = calculatedCirculatingSupply.toString();

      return {
        price: overviewData.price,
        marketCap: overviewData.marketCap,
        volume24h: overviewData.v24hUSD,
        totalSupply: totalSupplyString,
        circulatingSupply: circulatingSupplyString,
        topHolders,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching token stats for ${mintAddress}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch token stats for ${mintAddress}`,
      );
    }
  }

  private async fetchTopHolders(
    mintAddress: string,
    providedOverviewData?: BirdeyeTokenOverviewResponse['data'],
  ): Promise<TokenHolder[]> {
    const cacheKey = `birdeye_v3_holders_${mintAddress}`;
    const cachedData = this.topHoldersCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);
    const HOLDER_CACHE_TTL = 5 * 60 * 1000;

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < HOLDER_CACHE_TTL
    ) {
      return cachedData;
    }
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async (): Promise<TokenHolder[]> => {
      const apiUrl = `https://public-api.birdeye.so/defi/v3/token/holder?address=${mintAddress}&limit=10&offset=0`;
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'X-API-KEY': this.configService.get('BIRDEYE_API_KEY') || '',
            'x-chain': 'solana',
          },
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to parse error JSON' }));
          const errorMessage = errorData?.message || response.statusText;
          throw new Error(
            `Birdeye Holder API error (${response.status}): ${errorMessage}`,
          );
        }
        const data: BirdeyeV3HolderResponse = await response.json();
        if (
          !data?.success ||
          !data?.data?.items ||
          data.data.items.length === 0
        ) {
          this.logger.warn(
            `Birdeye V3 holder response unsuccessful or missing data for ${mintAddress}`,
          );
          return [];
        }

        const overviewData =
          providedOverviewData || (await this.fetchTokenOverview(mintAddress));
        if (!overviewData) {
          this.logger.warn(
            `Could not get overview data for ${mintAddress} while calculating holder percentages.`,
          );
          return [];
        }
        const overviewTotalSupply = overviewData.totalSupply ?? 0;

        const mappedHolders: TokenHolder[] = data.data.items.map((item) => {
          const holderAmount = item.ui_amount;
          const percentage =
            overviewTotalSupply > 0
              ? (holderAmount / overviewTotalSupply) * 100
              : 0;

          return {
            address: item.owner,
            amount: holderAmount,
            percentage: isFinite(percentage) ? percentage : 0,
          };
        });

        this.topHoldersCache.set(cacheKey, mappedHolders);
        this.cacheTimestamps.set(cacheKey, Date.now());
        return mappedHolders;
      } catch (error) {
        this.logger.error(
          `Error fetching Birdeye V3 top holders for ${mintAddress}:`,
          error.message,
        );
        return [];
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();
    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async getTokenPriceHistory(
    mintAddress: string,
    startTime: Date,
    endTime: Date,
    resolution: '15m' | '1H' | '1D' = '1D', // Default to daily resolution
  ): Promise<{ items: Array<{ unixTime: number; value: number }> }> {
    try {
      const startTimeUnix = Math.floor(startTime.getTime() / 1000);
      const endTimeUnix = Math.floor(endTime.getTime() / 1000);

      if (startTimeUnix >= endTimeUnix) {
        this.logger.warn(
          `Invalid time range for price history: startTime ${startTimeUnix} >= endTime ${endTimeUnix}`,
        );
        return { items: [] };
      }

      const apiUrl = `https://public-api.birdeye.so/defi/history_price?address=${mintAddress}&address_type=token&type=${resolution}&time_from=${startTimeUnix}&time_to=${endTimeUnix}`;

      const response = await fetch(apiUrl, {
        headers: {
          'X-API-KEY': this.configService.get('BIRDEYE_API_KEY') || '',
          'x-chain': 'solana',
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to parse error JSON' }));
        const errorMessage = errorData?.message || response.statusText;
        const status = response.status;
        this.logger.error(
          `Birdeye API error (${status}): ${errorMessage} for ${mintAddress}`,
        );

        if (status === 429) {
          throw new Error('Rate limit exceeded fetching price history');
        }

        throw new Error(
          `Failed to fetch price data from Birdeye: ${errorMessage}`,
        );
      }

      const data = await response.json();

      if (!data?.data?.items) {
        this.logger.warn(
          `No price history items found in Birdeye response for ${mintAddress}`,
        );
        return { items: [] };
      }

      this.logger.debug(
        `Fetched ${data.data.items.length} price points from Birdeye for ${mintAddress}`,
      );
      return data.data;
    } catch (error) {
      this.logger.error(
        `Error in getTokenPriceHistory for token ${mintAddress}:`,
        error,
      );
      throw error;
    }
  }
}
