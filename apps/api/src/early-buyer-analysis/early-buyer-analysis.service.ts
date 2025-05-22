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
import { EarlyTokenBuyerEntity, TokenEntity } from '../entities';

interface SolanaTrackerFirstBuyer {
  wallet: string;
  first_buy_time: number;
  last_transaction_time: number;
  held: number;
  sold: number;
  holding: number;
  realized: number;
  unrealized: number;
  total: number;
  total_invested: number;
  sold_usd: number;
  total_transactions: number;
  buy_transactions: number;
  sell_transactions: number;
  average_buy_amount: number;
  current_value: number;
  cost_basis: number;
}

const SOLANATRACKER_API_BASE = 'https://data.solanatracker.io';
const MAX_EARLY_BUYERS = 100;
const EARLY_BUYER_INFO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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

    let earlyBuyersEntities = token.earlyBuyers;

    const hasIncompleteData =
      !earlyBuyersEntities ||
      earlyBuyersEntities.length === 0 ||
      earlyBuyersEntities.length < MAX_EARLY_BUYERS ||
      earlyBuyersEntities.some((buyer) => !buyer.firstBuyTime);

    if (hasIncompleteData) {
      if (earlyBuyersEntities && earlyBuyersEntities.length > 0) {
        await this.earlyTokenBuyerRepository.delete({
          tokenMintAddress: mintAddress,
        });
      }

      earlyBuyersEntities = await this.fetchAndStoreEarlyBuyers(token);
      if (earlyBuyersEntities.length === 0) {
        this.earlyBuyerInfoCache.set(mintAddress, {
          data: null,
          timestamp: Date.now(),
        });
        return null;
      }
    }

    const freshPnLData = await this.fetchFreshPnLData(mintAddress);
    const pnlDataMap = new Map(
      freshPnLData.map((buyer) => [buyer.wallet, buyer]),
    );

    let stillHoldingCount = 0;
    const earlyBuyerWallets: EarlyBuyerWallet[] = earlyBuyersEntities.map(
      (buyerEntity) => {
        const freshData = pnlDataMap.get(buyerEntity.buyerWalletAddress);
        const isHolding = freshData ? freshData.holding > 0 : false;

        if (isHolding) {
          stillHoldingCount++;
        }

        return {
          address: buyerEntity.buyerWalletAddress,
          rank: buyerEntity.rank,
          purchaseTxSignature:
            buyerEntity.initialPurchaseTxSignature || undefined,
          // Stable data from database
          firstBuyTime: buyerEntity.firstBuyTime || undefined,
          totalInvested: buyerEntity.totalInvested || undefined,
          averageBuyAmount: buyerEntity.averageBuyAmount || undefined,
          buyTransactions: buyerEntity.buyTransactions || undefined,
          sellTransactions: buyerEntity.sellTransactions || undefined,
          // Fresh data from API
          isHolding,
          lastTransactionTime: freshData?.last_transaction_time,
          held: freshData?.held,
          sold: freshData?.sold,
          holding: freshData?.holding,
          realized: freshData?.realized,
          unrealized: freshData?.unrealized,
          total: freshData?.total,
          soldUsd: freshData?.sold_usd,
          totalTransactions: freshData?.total_transactions,
          currentValue: freshData?.current_value,
          costBasis: freshData?.cost_basis,
        };
      },
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

  private async fetchAndStoreEarlyBuyers(
    token: TokenEntity,
  ): Promise<EarlyTokenBuyerEntity[]> {
    const apiKey = this.configService.get<string>('SOLANA_TRACKER_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'SolanaTracker API key is not configured.',
      );
    }

    const apiUrl = `${SOLANATRACKER_API_BASE}/first-buyers/${token.mintAddress}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<SolanaTrackerFirstBuyer[]>(apiUrl, {
          headers: { 'x-api-key': apiKey },
        }),
      );

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      const firstBuyers = response.data;
      const earlyBuyersEntities: EarlyTokenBuyerEntity[] = [];

      for (let i = 0; i < firstBuyers.length && i < MAX_EARLY_BUYERS; i++) {
        const buyer = firstBuyers[i];

        // Create early buyer entity for all wallets
        const earlyBuyerEntity = this.earlyTokenBuyerRepository.create({
          tokenMintAddress: token.mintAddress,
          token: token,
          buyerWalletAddress: buyer.wallet,
          initialPurchaseTxSignature: null,
          initialPurchaseTimestamp: new Date(buyer.first_buy_time),
          rank: i + 1,
          // Store only stable data
          firstBuyTime: buyer.first_buy_time,
          totalInvested: buyer.total_invested,
          averageBuyAmount: buyer.average_buy_amount,
          buyTransactions: buyer.buy_transactions,
          sellTransactions: buyer.sell_transactions,
        });

        earlyBuyersEntities.push(earlyBuyerEntity);
      }

      if (earlyBuyersEntities.length > 0) {
        const savedEntities =
          await this.earlyTokenBuyerRepository.save(earlyBuyersEntities);
        return savedEntities;
      }

      return earlyBuyersEntities;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `SolanaTracker API error: ${JSON.stringify(error.toJSON())}`,
        );
      }
      return [];
    }
  }

  private async fetchFreshPnLData(
    mintAddress: string,
  ): Promise<SolanaTrackerFirstBuyer[]> {
    const apiKey = this.configService.get<string>('SOLANA_TRACKER_API_KEY');
    if (!apiKey) {
      this.logger.error(
        'SolanaTracker API key not configured. Cannot fetch fresh P&L data.',
      );
      return [];
    }

    const apiUrl = `${SOLANATRACKER_API_BASE}/first-buyers/${mintAddress}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<SolanaTrackerFirstBuyer[]>(apiUrl, {
          headers: { 'x-api-key': apiKey },
          timeout: 10000,
        }),
      );
      return response.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch fresh P&L data for token ${mintAddress}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
