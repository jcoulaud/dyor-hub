import {
  EarlyBuyerInfo,
  EarlyBuyerWallet,
  HotTokenResult,
  PaginatedHotTokensResult,
  PaginatedTokensResponse,
  ProcessedBundleData,
  SingleBundleData,
  TokenHolder,
  TokenStats,
  TrenchBundleApiResponse,
} from '@dyor-hub/types';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { subDays, subMonths } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { DataSource, FindManyOptions, In, Repository } from 'typeorm';
import { EarlyTokenBuyerEntity, TokenEntity, WalletEntity } from '../entities';
import { CommentEntity } from '../entities/comment.entity';
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
  v24hChangePercent?: number;
  buy24h?: number;
  sell24h?: number;
  uniqueWallet24h?: number;
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

interface DexScreenerTokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  info?: {
    imageUrl?: string;
    websites?: Array<{
      label?: string;
      url: string;
    }>;
    socials?: Array<{
      type?: string;
      url?: string;
      platform?: string;
      handle?: string;
    }>;
  };
}

interface BirdeyeSecurityResponseData {
  creatorAddress?: string | null;
  creationTx?: string | null;
  creationTime?: number | null;
  [key: string]: any;
}

interface BirdeyeSecurityResponse {
  data?: {
    data?: BirdeyeSecurityResponseData | null;
  } | null;
  success: boolean;
}

interface BirdeyeWalletTokenBalance {
  balance: number;
  uiAmount?: number;
  decimals?: number;
}

interface BirdeyeV1TokenTradeItem {
  blockUnixTime: number;
  txHash: string;
  side: 'buy' | 'sell';
  owner: string;
  txType?: string;
  source?: string;
  from?: { symbol?: string; address?: string; uiAmount?: number };
  to?: { symbol?: string; address?: string; uiAmount?: number };
  amount?: number;
  volume_usd?: number;
}

interface BirdeyeV1TokenTradesResponse {
  data?: {
    items?: BirdeyeV1TokenTradeItem[];
  };
  success?: boolean;
}

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';
const MAX_EARLY_BUYERS = 20;
const EARLY_BUYER_INFO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const EARLY_BUYER_INDIVIDUAL_BALANCE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly tokenOverviewCache: Map<string, any> = new Map();
  private readonly topHoldersCache: Map<string, any> = new Map();
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly cacheTimestamps: Map<string, number> = new Map();
  private readonly dexScreenerCache: Map<string, any> = new Map();
  private readonly tokenDataCache: Map<string, any> = new Map();

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(EarlyTokenBuyerEntity)
    private readonly earlyTokenBuyerRepository: Repository<EarlyTokenBuyerEntity>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
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

  /**
   * Fetches token data from DexScreener to update social links
   */
  private async fetchDexScreenerData(
    mintAddress: string,
  ): Promise<DexScreenerTokenPair[] | null> {
    const cacheKey = `dexscreener_${mintAddress}`;
    const cachedData = this.dexScreenerCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);
    const DEXSCREENER_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < DEXSCREENER_CACHE_TTL
    ) {
      return cachedData;
    }

    // Request Deduplication
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      const apiUrl = `https://api.dexscreener.com/tokens/v1/solana/${mintAddress}`;

      try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(
            `DexScreener API error (${response.status}): ${response.statusText}`,
          );
        }

        const data: DexScreenerTokenPair[] = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          this.logger.warn(
            `DexScreener response unsuccessful or missing data for ${mintAddress}`,
          );
          return null;
        }

        // Cache the data
        this.dexScreenerCache.set(cacheKey, data);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return data;
      } catch (error) {
        this.logger.error(
          `Error fetching DexScreener data for ${mintAddress}:`,
          error.message,
        );
        return null;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Updates token social links from DexScreener if they've changed
   */
  private async updateTokenSocialLinksFromDexScreener(
    token: TokenEntity,
  ): Promise<TokenEntity> {
    try {
      const dexScreenerData = await this.fetchDexScreenerData(
        token.mintAddress,
      );

      if (!dexScreenerData || dexScreenerData.length === 0) {
        return token;
      }

      // Use the first pair with info data
      const pairWithInfo = dexScreenerData.find((pair) => pair.info);
      if (!pairWithInfo || !pairWithInfo.info) {
        return token;
      }

      let updated = false;
      const updates: Partial<TokenEntity> = {};

      // Check for website URL
      if (pairWithInfo.info.websites && pairWithInfo.info.websites.length > 0) {
        const websiteUrl = pairWithInfo.info.websites[0]?.url;
        if (websiteUrl && token.websiteUrl !== websiteUrl) {
          this.logger.log(
            `Updating website URL for ${token.mintAddress} from ${token.websiteUrl || 'none'} to ${websiteUrl}`,
          );
          updates.websiteUrl = websiteUrl;
          updated = true;
        }
      }

      // Check for social links
      if (pairWithInfo.info.socials && pairWithInfo.info.socials.length > 0) {
        // Find Twitter handle - support both formats (platform and type fields)
        const twitterInfo = pairWithInfo.info.socials.find(
          (s) =>
            (s.platform &&
              (s.platform.toLowerCase() === 'twitter' ||
                s.platform.toLowerCase() === 'x')) ||
            (s.type && s.type.toLowerCase() === 'twitter') ||
            (s.url &&
              (s.url.includes('twitter.com') || s.url.includes('x.com'))),
        );

        if (twitterInfo) {
          let twitterHandle = '';

          // Handle the case where we have either handle or url
          if (twitterInfo.handle) {
            twitterHandle = twitterInfo.handle;
          } else if (twitterInfo.url) {
            // Extract handle from URL
            twitterHandle = twitterInfo.url
              .replace('https://x.com/', '')
              .replace('https://twitter.com/', '')
              .replace('@', '');
          }

          if (twitterHandle && token.twitterHandle !== twitterHandle) {
            this.logger.log(
              `Updating Twitter handle for ${token.mintAddress} from ${token.twitterHandle || 'none'} to ${twitterHandle}`,
            );
            updates.twitterHandle = twitterHandle;
            updated = true;
          }
        }

        // Find Telegram URL
        const telegramInfo = pairWithInfo.info.socials.find(
          (s) =>
            (s.platform && s.platform.toLowerCase() === 'telegram') ||
            (s.type && s.type.toLowerCase() === 'telegram') ||
            (s.url && s.url.includes('t.me')),
        );

        if (telegramInfo) {
          let telegramUrl = '';

          if (telegramInfo.handle) {
            telegramUrl = telegramInfo.handle;
          } else if (telegramInfo.url) {
            telegramUrl = telegramInfo.url;
          }

          if (!telegramUrl.startsWith('https://')) {
            telegramUrl = `https://t.me/${telegramUrl.replace('@', '')}`;
          }

          if (telegramUrl && token.telegramUrl !== telegramUrl) {
            this.logger.log(
              `Updating Telegram URL for ${token.mintAddress} from ${token.telegramUrl || 'none'} to ${telegramUrl}`,
            );
            updates.telegramUrl = telegramUrl;
            updated = true;
          }
        }
      }

      // Update token entity if changes were found
      if (updated) {
        try {
          Object.assign(token, updates);
          await this.tokenRepository.save(token);

          // If Twitter handle was updated, fetch and store username history
          if (updates.twitterHandle) {
            await this.twitterHistoryService
              .fetchAndStoreUsernameHistory(token)
              .catch((error) => {
                this.logger.error(
                  `Error fetching Twitter history for ${token.mintAddress}:`,
                  error,
                );
              });
          }
        } catch (saveError) {
          this.logger.error(
            `Error saving updated token data for ${token.mintAddress}:`,
            saveError,
          );
          return (
            (await this.tokenRepository.findOne({
              where: { mintAddress: token.mintAddress },
            })) || token
          );
        }
      }

      return token;
    } catch (error) {
      this.logger.error(
        `Error updating token social links for ${token.mintAddress}:`,
        error,
      );
      return token;
    }
  }

  async getTokenData(
    mintAddress: string,
    userId?: string,
  ): Promise<TokenEntity & { isWatchlisted?: boolean }> {
    try {
      let token = await this.tokenRepository.findOne({
        where: { mintAddress },
        relations: {
          verifiedCreatorUser: true,
        },
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

        // Fetch and store security info
        try {
          const securityInfo = await this.fetchTokenSecurityInfo(
            token.mintAddress,
          );
          if (securityInfo) {
            token.creatorAddress = securityInfo.creatorAddress ?? null;
            token.creationTx = securityInfo.creationTx ?? null;
            token.creationTime = securityInfo.creationTime
              ? new Date(securityInfo.creationTime * 1000)
              : null;
            token = await this.tokenRepository.save(token);
          } else {
            this.logger.log(
              `No security info found via Birdeye for new token ${token.mintAddress}`,
            );
          }
        } catch (fetchError) {
          this.logger.error(
            `Error fetching security info for new token ${token.mintAddress}: ${fetchError.message}`,
          );
        }

        // Fetch Twitter username history if available
        if (token.twitterHandle) {
          await this.twitterHistoryService.fetchAndStoreUsernameHistory(token);
        }
      } else {
        // Existing token: Track view count and check for updated socials from DexScreener
        token.viewsCount = (token.viewsCount || 0) + 1;

        if (!token.verifiedCreatorUser && token.verifiedCreatorUserId) {
          const reloadedToken = await this.tokenRepository.findOne({
            where: { mintAddress },
            relations: { verifiedCreatorUser: true },
          });
          if (reloadedToken) token = reloadedToken;
        }

        await this.tokenRepository.save(token);
        token = await this.updateTokenSocialLinksFromDexScreener(token);
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
    this.dexScreenerCache.clear();
    this.cacheTimestamps.clear();
    this.pendingRequests.clear();
  }

  async getTokens(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
  ): Promise<PaginatedTokensResponse> {
    const options: FindManyOptions<TokenEntity> = {
      take: limit,
      skip: (page - 1) * limit,
    };

    if (sortBy === 'createdAt') {
      options.order = { createdAt: 'DESC' };
    } else {
      options.order = { viewsCount: 'DESC' };
    }

    const [tokens, total] = await this.tokenRepository.findAndCount(options);
    const totalPages = Math.ceil(total / limit);

    return {
      data: tokens,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
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

      const totalSupplyString =
        overviewData.circulatingSupply?.toString() ?? '0';
      const circulatingSupplyString =
        (
          overviewData.circulatingSupply ?? overviewData.totalSupply
        )?.toString() ?? '0';

      return {
        price: overviewData.price,
        marketCap: overviewData.marketCap,
        volume24h: overviewData.v24hUSD,
        volume24hChangePercent: overviewData.v24hChangePercent,
        buyCount24h: overviewData.buy24h,
        sellCount24h: overviewData.sell24h,
        uniqueWallets24h: overviewData.uniqueWallet24h,
        holders: overviewData.holder,
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
    resolution: '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '1D' = '1D',
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

      return data.data;
    } catch (error) {
      this.logger.error(
        `Error in getTokenPriceHistory for token ${mintAddress}:`,
        error,
      );
      throw error;
    }
  }

  public async fetchCurrentTokenPrice(
    mintAddress: string,
  ): Promise<{ price: number } | null> {
    const cacheKey = `token_price_${mintAddress}`;

    // Request Deduplication
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      const apiUrl = `https://public-api.birdeye.so/defi/price?address=${mintAddress}`;
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
            `Birdeye Price API error (${response.status}): ${errorMessage}`,
          );
        }

        const data = await response.json();

        const price = data?.data?.value;

        if (typeof price !== 'number') {
          this.logger.warn(
            `Birdeye price response did not contain a valid number for ${mintAddress}`,
          );
          return null;
        }

        return { price };
      } catch (error) {
        this.logger.error(
          `Error fetching Birdeye current price for ${mintAddress}:`,
          error.message,
        );
        return null;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async getTokenBundles(mintAddress: string): Promise<ProcessedBundleData> {
    if (!mintAddress) {
      throw new Error('Mint address is required for fetching bundles.');
    }

    const cacheKey = `token_bundles_${mintAddress}`;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const TRENCH_API_URL = `https://trench.bot/api/bundle/bundle_advanced/${encodeURIComponent(mintAddress)}`;
        const controller = new AbortController();
        let timeoutId: NodeJS.Timeout | null = setTimeout(
          () => controller.abort(),
          15000,
        );

        try {
          const response = await fetch(TRENCH_API_URL, {
            method: 'GET',
            signal: controller.signal,
            headers: {},
          });

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          if (!response.ok) {
            let message = `Trench API error (${response.status})`;
            let errorData: unknown = null;
            try {
              errorData = await response.json();
              if (
                errorData &&
                typeof errorData === 'object' &&
                'error' in errorData &&
                typeof errorData.error === 'string'
              ) {
                message = errorData.error;
              }
            } catch {
              // Ignore if response is not JSON
            }

            this.logger.error(`${message} for ${mintAddress}`);
            throw new Error(message);
          }

          const rawData = (await response.json()) as TrenchBundleApiResponse;

          const processedBundles: SingleBundleData[] = Object.entries(
            rawData.bundles || {},
          ).map(([id, bundleData]) => ({
            ...bundleData,
            id,
          }));

          const responseData: ProcessedBundleData = {
            bonded: rawData.bonded,
            creator_analysis: rawData.creator_analysis,
            distributed_amount: rawData.distributed_amount,
            distributed_percentage: rawData.distributed_percentage,
            distributed_wallets: rawData.distributed_wallets,
            ticker: rawData.ticker,
            total_bundles: rawData.total_bundles,
            total_holding_amount: rawData.total_holding_amount,
            total_holding_percentage: rawData.total_holding_percentage,
            total_percentage_bundled: rawData.total_percentage_bundled,
            total_sol_spent: rawData.total_sol_spent,
            total_tokens_bundled: rawData.total_tokens_bundled,
            bundles: processedBundles,
          };

          return responseData;
        } catch (error) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Request to Trench API timed out.');
          }

          throw error;
        }
      } catch (error) {
        this.logger.error(
          `Error fetching Trench bundle data for ${mintAddress}:`,
          error,
        );
        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Finds tokens with the most comments in a specified time period.
   * @param page Page number for pagination
   * @param limit Items per page
   * @param timePeriod Time period to consider ('1d', '4d', '7d', '1M', etc.)
   * @returns Paginated hot tokens result
   */
  async getHotTokens(
    page: number = 1,
    limit: number = 8,
    timePeriod: string = '7d',
  ): Promise<PaginatedHotTokensResult> {
    try {
      const now = new Date();
      let startDate: Date;

      if (timePeriod.endsWith('d')) {
        const days = parseInt(timePeriod.slice(0, -1));
        if (isNaN(days) || days < 1) {
          this.logger.warn(
            `Invalid time period format: ${timePeriod}, using default 7d`,
          );
          startDate = subDays(now, 7);
        } else {
          startDate = subDays(now, days);
        }
      } else if (timePeriod.endsWith('M')) {
        const months = parseInt(timePeriod.slice(0, -1));
        if (isNaN(months) || months < 1) {
          this.logger.warn(
            `Invalid time period format: ${timePeriod}, using default 7d`,
          );
          startDate = subDays(now, 7);
        } else {
          startDate = subMonths(now, months);
        }
      } else {
        this.logger.warn(
          `Unsupported time period format: ${timePeriod}, using default 7d`,
        );
        startDate = subDays(now, 7);
      }

      const skip = (page - 1) * limit;

      const resultsQueryBuilder = this.commentRepository
        .createQueryBuilder('comment')
        .select('comment.tokenMintAddress', 'mintAddress')
        .addSelect('COUNT(comment.id)::int', 'commentCount')
        .where('comment.createdAt >= :date', { date: startDate })
        .andWhere('comment.removedById IS NULL')
        .groupBy('comment.tokenMintAddress')
        .orderBy('"commentCount"', 'DESC')
        .offset(skip)
        .limit(limit);

      const results = await resultsQueryBuilder.getRawMany();

      // Separate query to get the total count of distinct tokens meeting the criteria
      const total = await this.commentRepository
        .createQueryBuilder('comment')
        .select('comment.tokenMintAddress')
        .where('comment.createdAt >= :date', { date: startDate })
        .andWhere('comment.removedById IS NULL')
        .groupBy('comment.tokenMintAddress')
        .getCount();

      if (results.length === 0) {
        return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }

      const mintAddresses = results.map((r) => r.mintAddress);
      const tokens = await this.tokenRepository.find({
        where: { mintAddress: In(mintAddresses) },
        select: ['mintAddress', 'name', 'symbol', 'imageUrl'],
      });

      const tokenMap = new Map<
        string,
        Pick<TokenEntity, 'name' | 'symbol' | 'imageUrl'>
      >();
      tokens.forEach((token) => tokenMap.set(token.mintAddress, token));

      const hotTokens: HotTokenResult[] = results
        .map((result) => {
          const tokenInfo = tokenMap.get(result.mintAddress);
          return tokenInfo
            ? {
                mintAddress: result.mintAddress,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                imageUrl: tokenInfo.imageUrl ?? null,
                commentCount: result.commentCount,
              }
            : null;
        })
        .filter((token) => token !== null);

      const totalPages = Math.ceil(total / limit);

      return { items: hotTokens, meta: { total, page, limit, totalPages } };
    } catch (error) {
      this.logger.error('[getHotTokens] Error finding hot tokens:', error);
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
  }

  public async fetchTokenSecurityInfo(
    tokenAddress: string,
  ): Promise<BirdeyeSecurityResponseData | null> {
    const BIRDEYE_API_KEY = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!BIRDEYE_API_KEY) {
      this.logger.error('Security info fetch API key is missing in config.');
      throw new ServiceUnavailableException(
        'Server configuration error preventing verification.',
      );
    }

    const url = `https://public-api.birdeye.so/defi/token_security?address=${tokenAddress}`;
    const cacheKey = `token_security_${tokenAddress}`;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.get<BirdeyeSecurityResponse>(url, {
            headers: { 'X-API-KEY': BIRDEYE_API_KEY },
          }),
        );

        if (!response || !response.data) {
          this.logger.error(
            `Security info fetch API unexpected response structure for ${tokenAddress}:`,
            response,
          );
          return null;
        }

        if (response.status !== 200 || !response.data.success) {
          this.logger.error(
            `Security info fetch API error for ${tokenAddress}: Status ${response.status}`,
            response.data,
          );
          return null;
        }

        const securityData = response.data.data ?? null;
        return securityData;
      } catch (error) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Error fetching security info from external API for ${tokenAddress}: Status ${axiosError.response?.status}`,
          axiosError.response?.data || axiosError.message,
        );
        return null;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async verifyTokenCreator(
    tokenMintAddress: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // 1. Get user's verified wallets
    const userWallets = await this.walletRepository.find({
      where: { userId: userId, isVerified: true },
      select: ['address'],
    });

    if (userWallets.length === 0) {
      this.logger.warn(
        `User ${userId} has no verified wallets for verification.`,
      );
      throw new BadRequestException(
        'User has no verified wallets to perform verification.',
      );
    }
    const verifiedAddressesLower = userWallets.map((w) =>
      w.address.toLowerCase(),
    );

    // 2. Get token data
    const token = await this.tokenRepository.findOne({
      where: { mintAddress: tokenMintAddress },
    });

    if (!token) {
      this.logger.warn(`Token ${tokenMintAddress} not found for verification.`);
      throw new NotFoundException(
        `Token with address ${tokenMintAddress} not found.`,
      );
    }

    if (token.verifiedCreatorUserId && token.verifiedCreatorUserId !== userId) {
      this.logger.warn(
        `Token ${tokenMintAddress} already verified by user ${token.verifiedCreatorUserId}. Denying verification for user ${userId}.`,
      );
      throw new ConflictException(
        'This token creator status is already verified by another user.',
      );
    }
    if (token.verifiedCreatorUserId && token.verifiedCreatorUserId === userId) {
      this.logger.log(
        `Token ${tokenMintAddress} already verified by this user ${userId}.`,
      );
      return {
        success: true,
        message: 'You are already verified as the creator for this token.',
      };
    }

    // 3. Check if creator address exists on the token
    const creatorAddress = token.creatorAddress;
    if (!creatorAddress) {
      this.logger.warn(
        `Verification attempt failed for ${tokenMintAddress}: Creator address is not available. It might not have been fetched or Birdeye doesn't have it.`,
      );
      throw new BadRequestException(
        "Creator address is not available for this token. Verification cannot proceed. This might be because the external service doesn't have this data.",
      );
    }

    // 4. Comparison
    const isCreator =
      creatorAddress &&
      verifiedAddressesLower.includes(creatorAddress.toLowerCase());
    this.logger.log(
      `Token ${tokenMintAddress}: DB/Fetched Creator=${creatorAddress}, User Wallets Match=${isCreator}`,
    );

    // 5. Update if match
    if (isCreator) {
      const freshToken = await this.tokenRepository.findOne({
        where: { mintAddress: tokenMintAddress },
        select: ['verifiedCreatorUserId'],
      });
      if (
        freshToken?.verifiedCreatorUserId &&
        freshToken.verifiedCreatorUserId !== userId
      ) {
        this.logger.warn(
          `Race Condition: Token ${tokenMintAddress} verified by ${freshToken.verifiedCreatorUserId} while user ${userId} was verifying.`,
        );
        throw new ConflictException(
          'This token creator status was verified by another user just now.',
        );
      }
      if (freshToken?.verifiedCreatorUserId === userId) {
        this.logger.log(
          `Race Condition Check: Token ${tokenMintAddress} already verified by this user ${userId}.`,
        );
        return {
          success: true,
          message: 'You are already verified as the creator for this token.',
        };
      }

      token.verifiedCreatorUserId = userId;
      await this.tokenRepository.save(token);

      return {
        success: true,
        message: 'Creator status verified successfully!',
      };
    } else {
      this.logger.log(
        `Verification failed for user ${userId} and token ${tokenMintAddress}: Wallet mismatch.`,
      );
      return {
        success: false,
        message:
          'None of your verified wallets match the token creator address. Please go to /account/wallet to connect and verify the deployer wallet.',
      };
    }
  }

  async getEarlyBuyerInfo(mintAddress: string): Promise<EarlyBuyerInfo | null> {
    const cacheKey = `early_buyer_info_${mintAddress}`;
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedTimestamp &&
      Date.now() - cachedTimestamp < EARLY_BUYER_INFO_CACHE_TTL
    ) {
      const cachedData = this.tokenDataCache.get(cacheKey);
      if (cachedData) {
        return cachedData as EarlyBuyerInfo;
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async (): Promise<EarlyBuyerInfo | null> => {
      const token = await this.tokenRepository.findOneBy({
        mintAddress: mintAddress,
      });
      if (!token) {
        throw new NotFoundException(`Token ${mintAddress} not found.`);
      }

      const tokenCreationTimestampSeconds = token.creationTime
        ? Math.floor(token.creationTime.getTime() / 1000)
        : null;
      if (!tokenCreationTimestampSeconds) {
        this.tokenDataCache.set(cacheKey, null);
        this.cacheTimestamps.set(cacheKey, Date.now());
        return null;
      }

      let dbEarlyBuyers = await this.earlyTokenBuyerRepository.find({
        where: { token: { mintAddress: mintAddress } },
        order: { rank: 'ASC' },
        take: MAX_EARLY_BUYERS,
      });

      if (dbEarlyBuyers.length === 0) {
        const fetchedAndStoredBuyers =
          await this.fetchAndStoreFirstTwentyBuyers(
            token,
            tokenCreationTimestampSeconds,
          );
        if (fetchedAndStoredBuyers.length > 0) {
          dbEarlyBuyers = fetchedAndStoredBuyers;
        } else {
          this.tokenDataCache.set(cacheKey, null);
          this.cacheTimestamps.set(cacheKey, Date.now());
          return null;
        }
      }

      if (dbEarlyBuyers.length === 0) {
        this.tokenDataCache.set(cacheKey, null);
        this.cacheTimestamps.set(cacheKey, Date.now());
        return null;
      }

      const earlyBuyersWithStatus: EarlyBuyerWallet[] = [];
      let stillHoldingCount = 0;
      const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');

      const balanceCheckPromises = dbEarlyBuyers.map(async (buyerEntity) => {
        let isHolding = buyerEntity.isStillHolding;

        if (
          !(
            buyerEntity.lastCheckedAt &&
            Date.now() - buyerEntity.lastCheckedAt.getTime() <
              EARLY_BUYER_INDIVIDUAL_BALANCE_REFRESH_INTERVAL &&
            isHolding !== null
          )
        ) {
          try {
            const balanceResponse = await firstValueFrom(
              this.httpService.get<{ data?: BirdeyeWalletTokenBalance }>(
                `${BIRDEYE_API_BASE}/v1/wallet/token_balance?wallet=${buyerEntity.buyerWalletAddress}&token_address=${mintAddress}`,
                {
                  headers: { 'X-API-KEY': birdeyeApiKey, 'X-CHAIN': 'solana' },
                },
              ),
            );
            const rawBalance = balanceResponse.data?.data?.balance;
            isHolding = typeof rawBalance === 'number' && rawBalance > 0;

            buyerEntity.isStillHolding = isHolding;
            buyerEntity.lastCheckedAt = new Date();
            this.earlyTokenBuyerRepository
              .save(buyerEntity)
              .catch((e) =>
                this.logger.error(
                  `Failed to save buyer entity update for ${buyerEntity.id}`,
                  e.stack,
                ),
              );
          } catch (error) {
            isHolding = false;
            buyerEntity.isStillHolding = false;
            buyerEntity.lastCheckedAt = new Date();
            this.earlyTokenBuyerRepository
              .save(buyerEntity)
              .catch((e) =>
                this.logger.error(
                  `Failed to save buyer entity update on error for ${buyerEntity.id}`,
                  e.stack,
                ),
              );
          }
        }

        return {
          address: buyerEntity.buyerWalletAddress,
          isHolding: !!isHolding,
          purchaseTxSignature:
            buyerEntity.initialPurchaseTxSignature ?? undefined,
          rank: buyerEntity.rank,
        };
      });

      const results = await Promise.all(balanceCheckPromises);
      results.forEach((r) => {
        if (r.isHolding) stillHoldingCount++;
        earlyBuyersWithStatus.push({
          address: r.address,
          isHolding: r.isHolding,
          purchaseTxSignature: r.purchaseTxSignature,
          rank: r.rank,
        });
      });

      const result: EarlyBuyerInfo = {
        tokenMintAddress: mintAddress,
        totalEarlyBuyersCount: dbEarlyBuyers.length,
        stillHoldingCount,
        earlyBuyers: earlyBuyersWithStatus.sort((a, b) => {
          const rankA =
            dbEarlyBuyers.find((dbb) => dbb.buyerWalletAddress === a.address)
              ?.rank || MAX_EARLY_BUYERS + 1;
          const rankB =
            dbEarlyBuyers.find((dbb) => dbb.buyerWalletAddress === b.address)
              ?.rank || MAX_EARLY_BUYERS + 1;
          return rankA - rankB;
        }),
        lastChecked: new Date().toISOString(),
      };

      this.tokenDataCache.set(cacheKey, result);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return result;
    })().finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async fetchAndStoreFirstTwentyBuyers(
    token: TokenEntity,
    tokenCreationTimestampSeconds: number,
  ): Promise<EarlyTokenBuyerEntity[]> {
    const uniqueBuyerAddressesWithTime = new Map<
      string,
      { firstBuyTimestamp: number; txHash?: string }
    >();
    const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    let offset = 0;
    const limit = 50;
    let transactionsFetched = 0;
    const MAX_TRANSACTIONS_TO_FETCH = 500;

    while (
      transactionsFetched < MAX_TRANSACTIONS_TO_FETCH &&
      uniqueBuyerAddressesWithTime.size < MAX_EARLY_BUYERS
    ) {
      try {
        const apiUrl = `${BIRDEYE_API_BASE}/defi/txs/token`;
        const apiParams = {
          address: token.mintAddress,
          offset: offset,
          limit: limit,
          tx_type: 'swap',
          sort_type: 'asc',
        };

        const response = await firstValueFrom(
          this.httpService.get<BirdeyeV1TokenTradesResponse>(apiUrl, {
            params: apiParams,
            headers: { 'X-API-KEY': birdeyeApiKey, 'X-CHAIN': 'solana' },
          }),
        );

        const items = response.data?.data?.items;
        if (!items || items.length === 0) {
          break;
        }
        transactionsFetched += items.length;

        for (const tx of items) {
          if (tx.blockUnixTime < tokenCreationTimestampSeconds) continue;

          if (tx.side !== 'buy') continue;

          const buyerWallet = tx.owner;

          if (buyerWallet) {
            if (!uniqueBuyerAddressesWithTime.has(buyerWallet)) {
              uniqueBuyerAddressesWithTime.set(buyerWallet, {
                firstBuyTimestamp: tx.blockUnixTime,
                txHash: tx.txHash,
              });
              if (uniqueBuyerAddressesWithTime.size >= MAX_EARLY_BUYERS) break;
            }
          }
        }

        if (uniqueBuyerAddressesWithTime.size >= MAX_EARLY_BUYERS) {
          break;
        }

        offset += items.length;
      } catch (error) {
        this.logger.error(
          `Failed to fetch V1 transactions batch for ${token.mintAddress} (offset ${offset}): ${error.message}`,
          error.stack,
        );
        break;
      }
    }

    if (uniqueBuyerAddressesWithTime.size === 0) {
      return [];
    }

    const buyersData = Array.from(uniqueBuyerAddressesWithTime.entries()).map(
      ([address, data]) => ({ address, ...data }),
    );

    const newEntities: EarlyTokenBuyerEntity[] = [];
    for (let i = 0; i < buyersData.length; i++) {
      const buyer = buyersData[i];
      const purchaseTimestamp =
        buyer.firstBuyTimestamp && Number.isFinite(buyer.firstBuyTimestamp)
          ? new Date(buyer.firstBuyTimestamp * 1000)
          : null;
      if (!purchaseTimestamp) {
        continue;
      }
      const newBuyer = this.earlyTokenBuyerRepository.create({
        token: token,
        tokenMintAddress: token.mintAddress,
        buyerWalletAddress: buyer.address,
        rank: i + 1,
        initialPurchaseTimestamp: purchaseTimestamp,
        initialPurchaseTxSignature: buyer.txHash,
        isStillHolding: null,
        lastCheckedAt: null,
      });
      newEntities.push(newBuyer);
    }

    if (newEntities.length > 0) {
      try {
        await this.earlyTokenBuyerRepository.save(newEntities);

        return newEntities;
      } catch (dbError) {
        this.logger.error(
          `Failed to store early buyers for ${token.mintAddress} from V1: ${dbError.message}`,
          dbError.stack,
        );
        return [];
      }
    }
    return [];
  }
}
