import { TokenHolder, TokenStats } from '@dyor-hub/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';
import { WatchlistService } from '../watchlist/watchlist.service';
import { TwitterHistoryService } from './twitter-history.service';

interface DexScreenerResponse {
  pairs?: Array<{
    baseToken?: {
      address: string;
      name: string;
      symbol: string;
    };
    url?: string;
    info?: {
      websites?: Array<{
        label: string;
        url: string;
      }>;
      socials?: Array<{
        type: string;
        url: string;
      }>;
    };
    priceUsd?: number;
    fdv?: number;
    volume?: {
      h24?: number;
    };
  }>;
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly HELIUS_RPC_URL: string;
  private readonly assetDataCache: Map<string, any> = new Map();
  private readonly dexScreenerCache: Map<string, any> = new Map();
  private readonly topHoldersCache: Map<string, any> = new Map();
  private readonly ipfsCache: Map<string, any> = new Map();
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly CACHE_TTL = 60 * 1000;
  private readonly cacheTimestamps: Map<string, number> = new Map();

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly configService: ConfigService,
    private readonly twitterHistoryService: TwitterHistoryService,
    private readonly watchlistService?: WatchlistService,
  ) {
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');
    this.HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  /**
   * Fetches DexScreener data with caching
   */
  public async fetchDexScreenerData(mintAddress: string) {
    const cacheKey = `dex_${mintAddress}`;
    const cachedData = this.dexScreenerCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < this.CACHE_TTL
    ) {
      return cachedData;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`,
        );

        if (!response.ok) {
          throw new Error(`DexScreener API error: ${response.statusText}`);
        }

        const data: DexScreenerResponse = await response.json();
        const pair = data.pairs?.[0];

        if (!pair) {
          return null;
        }

        const websiteUrl = pair.info?.websites?.find(
          (w) => w.label === 'Website',
        )?.url;

        const telegramUrl = pair.info?.socials?.find(
          (s) => s.type === 'telegram',
        )?.url;

        const twitterUrl = pair.info?.socials?.find(
          (s) => s.type === 'twitter',
        )?.url;

        const result = {
          websiteUrl,
          telegramUrl,
          twitterHandle: twitterUrl?.replace('https://twitter.com/', ''),
          price: pair.priceUsd,
          marketCap: pair.fdv,
          volume24h: pair.volume?.h24,
        };

        this.dexScreenerCache.set(cacheKey, result);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return result;
      } catch (error) {
        this.logger.error(
          `Error fetching DexScreener data for ${mintAddress}:`,
          error,
        );
        return null;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async refreshTokenMetadata(mintAddress: string): Promise<TokenEntity> {
    const token = await this.tokenRepository.findOne({
      where: { mintAddress },
      relations: {
        comments: true,
      },
    });

    if (!token) {
      throw new NotFoundException(
        `Token with address ${mintAddress} not found`,
      );
    }

    // Fetch asset data once
    const assetData = await this.fetchAssetData(mintAddress);
    const dexData = await this.fetchDexScreenerData(mintAddress);

    // Process metadata from asset data
    let metadata = this.processTokenMetadata(assetData);

    // Try to enhance with IPFS data if available
    if (assetData?.content?.json_uri) {
      const ipfsMetadata = await this.fetchIpfsMetadata(
        assetData.content.json_uri,
        assetData,
      );
      if (ipfsMetadata) {
        metadata = { ...metadata, ...ipfsMetadata };
      }
    }

    if (metadata || dexData) {
      const updatedToken = {
        ...token,
        ...metadata,
        ...(dexData && {
          websiteUrl: dexData.websiteUrl || token.websiteUrl,
          telegramUrl: dexData.telegramUrl || token.telegramUrl,
          twitterHandle: dexData.twitterHandle || token.twitterHandle,
        }),
      };

      await this.tokenRepository.save(updatedToken);

      // Fetch Twitter username history if available
      if (updatedToken.twitterHandle) {
        await this.twitterHistoryService.fetchAndStoreUsernameHistory(
          updatedToken,
        );
      }

      return updatedToken;
    }

    return token;
  }

  async getTokenData(
    mintAddress: string,
    userId?: string,
  ): Promise<TokenEntity & { isWatchlisted?: boolean }> {
    try {
      let token = await this.tokenRepository.findOne({
        where: { mintAddress },
        relations: {
          comments: true,
        },
      });

      if (!token) {
        // Fetch asset data once
        const assetData = await this.fetchAssetData(mintAddress);
        const dexData = await this.fetchDexScreenerData(mintAddress);

        // Process metadata from asset data
        let metadata = this.processTokenMetadata(assetData);

        // Try to enhance with IPFS data if available
        if (assetData?.content?.json_uri) {
          const ipfsMetadata = await this.fetchIpfsMetadata(
            assetData.content.json_uri,
            assetData,
          );
          if (ipfsMetadata) {
            metadata = { ...metadata, ...ipfsMetadata };
          }
        }

        // Initialize token with metadata
        const baseTokenData = {
          mintAddress,
          name: metadata?.name,
          symbol: metadata?.symbol,
          description: metadata?.description,
          imageUrl: metadata?.imageUrl,
          websiteUrl: metadata?.websiteUrl,
          telegramUrl: metadata?.telegramUrl,
          twitterHandle: metadata?.twitterHandle,
          viewsCount: 1, // First view
        };

        // Merge with DEX data when primary source is missing info
        if (dexData) {
          baseTokenData.websiteUrl =
            baseTokenData.websiteUrl || dexData.websiteUrl;
          baseTokenData.telegramUrl =
            baseTokenData.telegramUrl || dexData.telegramUrl;
          baseTokenData.twitterHandle =
            baseTokenData.twitterHandle ||
            dexData.twitterHandle?.replace('https://x.com/', '');
        }

        // Validate token exists
        if (!metadata?.name && !metadata?.symbol) {
          throw new NotFoundException(
            `Token with address ${mintAddress} not found`,
          );
        }

        const newToken = this.tokenRepository.create(baseTokenData);
        await this.tokenRepository.save(newToken);
        token = await this.tokenRepository.findOne({
          where: { mintAddress },
          relations: {
            comments: true,
          },
        });

        // Fetch Twitter username history if available
        if (token.twitterHandle) {
          await this.twitterHistoryService.fetchAndStoreUsernameHistory(token);
        }
      } else {
        // Track view count
        token.viewsCount = (token.viewsCount || 0) + 1;
        await this.tokenRepository.save(token);

        // Check if we need to fetch Twitter history
        if (token.twitterHandle) {
          const existingHistory =
            await this.twitterHistoryService.getUsernameHistory(mintAddress);
          if (!existingHistory) {
            await this.twitterHistoryService.fetchAndStoreUsernameHistory(
              token,
            );
          }
        }
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
      this.logger.error(`Error fetching token data for ${mintAddress}:`, error);
      throw error;
    }
  }

  /**
   * Fetches asset data from Helius with request deduplication and caching
   */
  private async fetchAssetData(mintAddress: string) {
    const cacheKey = `asset_${mintAddress}`;
    const cachedData = this.assetDataCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < this.CACHE_TTL
    ) {
      return cachedData;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await fetch(this.HELIUS_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'asset-data',
            method: 'getAsset',
            params: {
              id: mintAddress,
              displayOptions: {
                showFungible: true,
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Helius API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.result;

        this.assetDataCache.set(cacheKey, result);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return result;
      } catch (error) {
        this.logger.error(
          `Error fetching asset data for ${mintAddress}:`,
          error,
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
   * Clears all API data caches
   */
  public clearCaches() {
    this.assetDataCache.clear();
    this.dexScreenerCache.clear();
    this.topHoldersCache.clear();
    this.ipfsCache.clear();
    this.cacheTimestamps.clear();
    this.pendingRequests.clear();
  }

  // Process token metadata from asset data
  private processTokenMetadata(assetData: any) {
    if (!assetData) {
      return null;
    }

    try {
      // Get basic metadata from Helius
      const metadata = {
        name: assetData.content?.metadata?.name,
        symbol: assetData.content?.metadata?.symbol,
        description: null,
        imageUrl: null,
        websiteUrl: null,
        telegramUrl: null,
        twitterHandle: null,
        supply: assetData.token_info?.supply,
        decimals: assetData.token_info?.decimals,
      };

      return metadata;
    } catch (error) {
      this.logger.error(`Error processing token metadata:`, error);
      return null;
    }
  }

  // Extract token data from asset data
  private extractTokenData(assetData: any) {
    if (!assetData) {
      return {
        supply: '0',
        decimals: 9,
        circulatingSupply: '0',
      };
    }

    const tokenInfo = assetData.token_info || {};

    return {
      supply: tokenInfo.supply,
      decimals: tokenInfo.decimals,
      circulatingSupply: tokenInfo.supply, // Assuming all supply is circulating unless we have better data
    };
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
      // First, check if the token exists
      const token = await this.getTokenData(mintAddress);
      if (!token) {
        throw new NotFoundException(
          `Token with mint address ${mintAddress} not found`,
        );
      }

      // Fetch asset data once
      const assetData = await this.fetchAssetData(mintAddress);

      // Extract token data from asset data
      const tokenData = this.extractTokenData(assetData);

      // Fetch market data from DexScreener
      const dexScreenerData = await this.fetchDexScreenerData(mintAddress);

      // Get top holders
      const topHolders = await this.fetchTopHolders(mintAddress);

      return {
        // Market data
        price: dexScreenerData?.price,
        marketCap: dexScreenerData?.marketCap,
        volume24h: dexScreenerData?.volume24h,

        // Supply information
        totalSupply: tokenData.supply
          ? (
              Number(tokenData.supply) / Math.pow(10, tokenData.decimals || 0)
            ).toString()
          : '0',
        circulatingSupply: tokenData.circulatingSupply
          ? (
              Number(tokenData.circulatingSupply) /
              Math.pow(10, tokenData.decimals || 0)
            ).toString()
          : undefined,

        // Holder information
        topHolders,

        // Last updated timestamp
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error fetching token stats for ${mintAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Fetches top token holders with caching
   */
  private async fetchTopHolders(mintAddress: string): Promise<TokenHolder[]> {
    const cacheKey = `holders_${mintAddress}`;
    const cachedData = this.topHoldersCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < this.CACHE_TTL
    ) {
      return cachedData;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const assetData = await this.fetchAssetData(mintAddress);
        const tokenData = this.extractTokenData(assetData);

        const totalSupply = Number(tokenData.supply || 0);

        if (totalSupply <= 0) {
          this.logger.warn(
            `Invalid total supply for token ${mintAddress}: ${totalSupply}`,
          );
          return [];
        }

        const response = await fetch(this.HELIUS_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'token-largest-accounts',
            method: 'getTokenLargestAccounts',
            params: [mintAddress],
          }),
        });

        if (!response.ok) {
          throw new Error(`Helius API error: ${response.statusText}`);
        }

        const data = await response.json();
        const accounts = data.result?.value || [];

        if (accounts.length === 0) {
          return [];
        }

        const result = accounts.slice(0, 10).map((account) => {
          const rawAmount = Number(account.amount || 0);
          const percentage = (rawAmount / totalSupply) * 100;

          return {
            address: account.address,
            amount: rawAmount,
            percentage,
          };
        });

        this.topHoldersCache.set(cacheKey, result);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return result;
      } catch (error) {
        this.logger.error(
          `Error fetching top holders for ${mintAddress}:`,
          error,
        );
        return [];
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Fetches IPFS metadata with caching
   */
  private async fetchIpfsMetadata(jsonUri: string, assetData: any) {
    const cacheKey = `ipfs_${jsonUri}`;
    const cachedData = this.ipfsCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < this.CACHE_TTL
    ) {
      return cachedData;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const ipfsResponse = await fetch(jsonUri);
        if (!ipfsResponse.ok) {
          return null;
        }

        const ipfsMetadata = await ipfsResponse.json();

        const enhancedMetadata: any = {
          name: ipfsMetadata.name,
          symbol: ipfsMetadata.symbol,
          description: ipfsMetadata.description || null,
          imageUrl:
            ipfsMetadata.image || assetData.content?.links?.image || null,
          websiteUrl: ipfsMetadata.website || ipfsMetadata.external_url || null,
          telegramUrl: ipfsMetadata.telegram || null,
          twitterHandle: null,
        };

        if (ipfsMetadata.twitter) {
          enhancedMetadata.twitterHandle = ipfsMetadata.twitter
            .replace('https://x.com/', '')
            .replace('https://twitter.com/', '')
            .replace('@', '');
        }

        this.ipfsCache.set(cacheKey, enhancedMetadata);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return enhancedMetadata;
      } catch (error) {
        this.logger.error(
          `Error fetching IPFS metadata from ${jsonUri}:`,
          error,
        );
        return null;
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
