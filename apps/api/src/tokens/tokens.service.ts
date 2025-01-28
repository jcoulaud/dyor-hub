import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const HELIUS_API_KEY = this.configService.get<string>('HELIUS_API_KEY');
    this.HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
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
      relations: ['comments', 'comments.votes'],
    });

    if (!token) {
      throw new NotFoundException(
        `Token with address ${mintAddress} not found`,
      );
    }

    const [metadata, dexData] = await Promise.all([
      this.fetchTokenMetadata(mintAddress),
      this.fetchDexScreenerData(mintAddress),
    ]);

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
        relations: ['comments', 'comments.votes'],
      });

      if (!token) {
        const [metadata, dexData] = await Promise.all([
          this.fetchTokenMetadata(mintAddress),
          this.fetchDexScreenerData(mintAddress),
        ]);

        console.log('metadata', metadata);
        console.log('dexData', dexData);

        if (!metadata) {
          throw new NotFoundException(
            `Token with address ${mintAddress} not found`,
          );
        }

        const newToken = this.tokenRepository.create({
          mintAddress,
          ...metadata,
          ...(dexData && {
            websiteUrl: dexData.websiteUrl || metadata.websiteUrl,
            telegramUrl: dexData.telegramUrl || metadata.telegramUrl,
            twitterHandle: dexData.twitterHandle || metadata.twitterHandle,
          }),
          viewsCount: 1,
        });

        await this.tokenRepository.save(newToken);
        token = await this.tokenRepository.findOne({
          where: { mintAddress },
          relations: ['comments', 'comments.votes'],
        });
      } else {
        token.viewsCount += 1;
        await this.tokenRepository.save(token);
      }

      return token;
    } catch (error) {
      this.logger.error(`Error fetching token ${mintAddress}:`, error);
      throw error;
    }
  }

  private async fetchTokenMetadata(mintAddress: string) {
    try {
      const metadataResponse = await fetch(this.HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'metadata',
          method: 'getAsset',
          params: {
            id: mintAddress,
            displayOptions: {
              showFungible: true,
            },
          },
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error(`Helius API error: ${metadataResponse.statusText}`);
      }

      const data = await metadataResponse.json();
      const result = data.result;

      if (!result) {
        throw new Error('No metadata found');
      }

      // Get basic metadata from Helius
      const metadata = {
        name: result.content?.metadata?.name,
        symbol: result.content?.metadata?.symbol,
        description: result.content?.metadata?.description,
        imageUrl: result.content?.links?.image,
        websiteUrl: null,
        telegramUrl: null,
        twitterHandle: null,
      };

      // Fetch additional metadata from IPFS
      const jsonUri = result.content?.json_uri;
      if (jsonUri) {
        try {
          const ipfsResponse = await fetch(jsonUri);
          if (ipfsResponse.ok) {
            const ipfsMetadata = await ipfsResponse.json();
            metadata.websiteUrl = ipfsMetadata.website;
            metadata.telegramUrl = ipfsMetadata.telegram;
            metadata.twitterHandle = ipfsMetadata.twitter?.replace(
              'https://x.com/',
              '',
            );
          }
        } catch (error) {
          this.logger.error(
            `Error fetching IPFS metadata from ${jsonUri}:`,
            error,
          );
        }
      }

      return metadata;
    } catch (error) {
      this.logger.error(`Error fetching metadata for ${mintAddress}:`, error);
      return null;
    }
  }

  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokenRepository.find({
      relations: ['comments', 'comments.votes'],
      order: {
        viewsCount: 'DESC',
      },
    });
  }
}
