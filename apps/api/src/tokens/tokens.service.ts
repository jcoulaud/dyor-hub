import { TokenHolder, TokenStats } from '@dyor-hub/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';

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

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly configService: ConfigService,
  ) {
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');
    this.HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  private async fetchDexScreenerData(mintAddress: string) {
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

      return {
        websiteUrl,
        telegramUrl,
        twitterHandle: twitterUrl?.replace('https://twitter.com/', ''),
        price: pair.priceUsd,
        marketCap: pair.fdv,
        volume24h: pair.volume?.h24,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching DexScreener data for ${mintAddress}:`,
        error,
      );
      return null;
    }
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
      return updatedToken;
    }

    return token;
  }

  async getTokenData(mintAddress: string): Promise<TokenEntity> {
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
      } else {
        // Track view count
        token.viewsCount = (token.viewsCount || 0) + 1;
        await this.tokenRepository.save(token);
      }

      return token;
    } catch (error) {
      this.logger.error(`Error fetching token ${mintAddress}:`, error);
      throw error;
    }
  }

  // Shared method to fetch asset data from Helius
  private async fetchAssetData(mintAddress: string) {
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
      return data.result;
    } catch (error) {
      this.logger.error(`Error fetching asset data for ${mintAddress}:`, error);
      return null;
    }
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

  private async fetchTopHolders(mintAddress: string): Promise<TokenHolder[]> {
    try {
      // First, get the token data to access the correct total supply
      const assetData = await this.fetchAssetData(mintAddress);
      const tokenData = this.extractTokenData(assetData);

      // Get the total supply and decimals from token data
      const totalSupply = Number(tokenData.supply || 0);
      const decimals = tokenData.decimals || 0;

      if (totalSupply <= 0) {
        this.logger.warn(
          `Invalid total supply for token ${mintAddress}: ${totalSupply}`,
        );
        return [];
      }

      // Use getTokenLargestAccounts endpoint to get the largest token accounts
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

      // Map to TokenHolder format with accurate percentages based on the actual total supply
      return accounts.slice(0, 10).map((account) => {
        const rawAmount = Number(account.amount || 0);
        // Calculate percentage based on the actual total supply
        const percentage = (rawAmount / totalSupply) * 100;

        return {
          address: account.address,
          amount: rawAmount,
          percentage,
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching top holders for ${mintAddress}:`,
        error,
      );
      return [];
    }
  }

  // Fetch IPFS metadata
  private async fetchIpfsMetadata(jsonUri: string, assetData: any) {
    try {
      const ipfsResponse = await fetch(jsonUri);
      if (!ipfsResponse.ok) {
        return null;
      }

      const ipfsMetadata = await ipfsResponse.json();

      // Create enhanced metadata
      const enhancedMetadata: any = {
        name: ipfsMetadata.name,
        symbol: ipfsMetadata.symbol,
        description: ipfsMetadata.description || null,
        imageUrl: ipfsMetadata.image || assetData.content?.links?.image || null,
        websiteUrl: ipfsMetadata.website || ipfsMetadata.external_url || null,
        telegramUrl: ipfsMetadata.telegram || null,
        twitterHandle: null,
      };

      // Handle different Twitter URL formats
      if (ipfsMetadata.twitter) {
        enhancedMetadata.twitterHandle = ipfsMetadata.twitter
          .replace('https://x.com/', '')
          .replace('https://twitter.com/', '')
          .replace('@', '');
      }

      return enhancedMetadata;
    } catch (error) {
      this.logger.error(`Error fetching IPFS metadata from ${jsonUri}:`, error);
      return null;
    }
  }
}
