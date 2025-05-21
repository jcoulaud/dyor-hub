import { EarlyBuyerInfo, EarlyBuyerWallet } from '@dyor-hub/types';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { EarlyTokenBuyerEntity, TokenEntity, WalletEntity } from '../entities';

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

interface BirdeyeWalletTokenBalance {
  balance: number;
  uiAmount?: number;
  decimals?: number;
}

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';
const MAX_EARLY_BUYERS = 20;
const EARLY_BUYER_INFO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const EARLY_BUYER_INDIVIDUAL_BALANCE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class EarlyBuyerAnalysisService {
  private readonly logger = new Logger(EarlyBuyerAnalysisService.name);
  private readonly earlyBuyerInfoCache: Map<
    string,
    { data: EarlyBuyerInfo | null; timestamp: number }
  > = new Map();

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(EarlyTokenBuyerEntity)
    private readonly earlyTokenBuyerRepository: Repository<EarlyTokenBuyerEntity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getEarlyBuyerInfo(mintAddress: string): Promise<EarlyBuyerInfo | null> {
    const cachedEntry = this.earlyBuyerInfoCache.get(mintAddress);
    if (
      cachedEntry &&
      Date.now() - cachedEntry.timestamp < EARLY_BUYER_INFO_CACHE_TTL
    ) {
      if (cachedEntry.data) {
        this.refreshIndividualWalletBalancesIfNeeded(
          cachedEntry.data,
          mintAddress,
        ).catch((error) =>
          this.logger.error(
            `Error refreshing individual wallet balances for ${mintAddress}`,
            error,
          ),
        );
      }
      return cachedEntry.data;
    }

    const token = await this.tokenRepository.findOne({
      where: { mintAddress },
      relations: ['earlyBuyers'],
    });

    if (!token) {
      throw new NotFoundException(
        `Token with mint address ${mintAddress} not found.`,
      );
    }

    const tokenCreationTimestampSeconds = token.creationTime
      ? Math.floor(new Date(token.creationTime).getTime() / 1000)
      : null;

    if (!tokenCreationTimestampSeconds) {
      this.earlyBuyerInfoCache.set(mintAddress, {
        data: null,
        timestamp: Date.now(),
      });
      return null;
    }

    let earlyBuyersEntities = token.earlyBuyers;

    if (!earlyBuyersEntities || earlyBuyersEntities.length === 0) {
      earlyBuyersEntities = await this.fetchAndStoreFirstTwentyBuyers(
        token,
        tokenCreationTimestampSeconds,
      );
      if (earlyBuyersEntities.length === 0) {
        this.earlyBuyerInfoCache.set(mintAddress, {
          data: null,
          timestamp: Date.now(),
        });
        return null;
      }
    }

    let stillHoldingCount = 0;
    const earlyBuyerWallets: EarlyBuyerWallet[] = await Promise.all(
      earlyBuyersEntities.map(async (buyerEntity) => {
        const currentBalance = await this.fetchWalletTokenBalance(
          buyerEntity.buyerWalletAddress,
          mintAddress,
        );
        const isHolding = currentBalance > 0;
        if (isHolding) {
          stillHoldingCount++;
        }

        this.earlyTokenBuyerRepository
          .update(buyerEntity.id, {
            isStillHolding: isHolding,
            lastCheckedAt: new Date(),
          })
          .catch((err) =>
            this.logger.error(
              `Failed to update buyer entity ${buyerEntity.id}`,
              err,
            ),
          );

        return {
          address: buyerEntity.buyerWalletAddress,
          isHolding: isHolding,
          purchaseTxSignature:
            buyerEntity.initialPurchaseTxSignature || undefined,
          rank: buyerEntity.rank,
        };
      }),
    );

    const result: EarlyBuyerInfo = {
      tokenMintAddress: mintAddress,
      totalEarlyBuyersCount: earlyBuyersEntities.length,
      stillHoldingCount: stillHoldingCount,
      earlyBuyers: earlyBuyerWallets,
      lastChecked: new Date().toISOString(),
    };

    this.earlyBuyerInfoCache.set(mintAddress, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  private async refreshIndividualWalletBalancesIfNeeded(
    cachedData: EarlyBuyerInfo,
    mintAddress: string,
  ) {
    const now = Date.now();
    let needsRecalculate = false;
    const mainCacheEntry = this.earlyBuyerInfoCache.get(mintAddress);

    const updatedBuyers = await Promise.all(
      cachedData.earlyBuyers.map(async (buyer) => {
        if (
          mainCacheEntry &&
          now - new Date(cachedData.lastChecked).getTime() >
            EARLY_BUYER_INDIVIDUAL_BALANCE_REFRESH_INTERVAL
        ) {
          needsRecalculate = true;

          const newBalance = await this.fetchWalletTokenBalance(
            buyer.address,
            mintAddress,
          );
          const isHolding = newBalance > 0;

          this.earlyTokenBuyerRepository
            .findOne({
              where: {
                buyerWalletAddress: buyer.address,
                tokenMintAddress: mintAddress,
              },
            })
            .then((entity) => {
              if (entity) {
                this.earlyTokenBuyerRepository
                  .update(entity.id, {
                    isStillHolding: isHolding,
                    lastCheckedAt: new Date(),
                  })
                  .catch((err) =>
                    this.logger.error(
                      `Failed to update buyer entity ${entity.id} during refresh`,
                      err,
                    ),
                  );
              }
            });

          return {
            ...buyer,
            isHolding: isHolding,
          };
        }
        return buyer;
      }),
    );

    if (needsRecalculate) {
      let newStillHoldingCount = 0;
      updatedBuyers.forEach((b) => {
        if (b.isHolding) newStillHoldingCount++;
      });

      this.earlyBuyerInfoCache.set(mintAddress, {
        data: {
          ...cachedData,
          earlyBuyers: updatedBuyers,
          stillHoldingCount: newStillHoldingCount,
          lastChecked: new Date().toISOString(),
        },
        timestamp: mainCacheEntry?.timestamp || now,
      });
    }
  }

  private async fetchAndStoreFirstTwentyBuyers(
    token: TokenEntity,
    tokenCreationTimestampSeconds: number,
  ): Promise<EarlyTokenBuyerEntity[]> {
    const apiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Birdeye API key is not configured.',
      );
    }

    const fetchStartTime = Date.now();

    const tradesUrl = `${BIRDEYE_API_BASE}/defi/txns/token?address=${token.mintAddress}&tx_type=swap&sort_by=asc&offset=0&limit=200`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<BirdeyeV1TokenTradesResponse>(tradesUrl, {
          headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' },
        }),
      );

      const fetchEndTime = Date.now();

      if (!response.data?.success || !response.data.data?.items) {
        return [];
      }

      const trades = response.data.data.items;
      const uniqueBuyersMap = new Map<string, EarlyTokenBuyerEntity>();
      let currentRank = 1;

      for (const trade of trades) {
        if (currentRank > MAX_EARLY_BUYERS) break;

        if (
          trade.side !== 'buy' ||
          !trade.owner ||
          !trade.txHash ||
          !trade.blockUnixTime ||
          typeof trade.to?.uiAmount !== 'number' ||
          trade.to?.address?.toLowerCase() !== token.mintAddress.toLowerCase()
        ) {
          continue;
        }

        if (trade.blockUnixTime < tokenCreationTimestampSeconds - 60) {
          continue;
        }

        if (!uniqueBuyersMap.has(trade.owner)) {
          let wallet = await this.walletRepository.findOne({
            where: { address: trade.owner },
          });
          if (!wallet) {
            continue;
          }

          const earlyBuyerEntity = this.earlyTokenBuyerRepository.create({
            tokenMintAddress: token.mintAddress,
            token: token,
            buyerWalletAddress: trade.owner,
            initialPurchaseTxSignature: trade.txHash,
            initialPurchaseTimestamp: new Date(trade.blockUnixTime * 1000),
            rank: currentRank,
            isStillHolding: null,
            lastCheckedAt: null,
          });
          uniqueBuyersMap.set(trade.owner, earlyBuyerEntity);
          currentRank++;
        }
      }
      const newEarlyBuyersEntities = Array.from(uniqueBuyersMap.values());
      if (newEarlyBuyersEntities.length > 0) {
        await this.earlyTokenBuyerRepository.save(newEarlyBuyersEntities);
      }
      return newEarlyBuyersEntities;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Axios error details: ${JSON.stringify(error.toJSON())}`,
        );
      }
      return [];
    }
  }

  private async fetchWalletTokenBalance(
    walletAddress: string,
    tokenMintAddress: string,
  ): Promise<number> {
    const apiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!apiKey) {
      this.logger.error(
        'Birdeye API key not configured. Cannot fetch wallet balance.',
      );
      return 0;
    }

    const url = `${BIRDEYE_API_BASE}/v1/wallet/token_balance?wallet_address=${walletAddress}&token_address=${tokenMintAddress}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: BirdeyeWalletTokenBalance }>(url, {
          headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' },
          timeout: 5000,
        }),
      );
      return response.data?.data?.uiAmount ?? response.data?.data?.balance ?? 0;
    } catch (error) {
      this.logger.error(
        `Failed to fetch balance for wallet ${walletAddress}, token ${tokenMintAddress}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
