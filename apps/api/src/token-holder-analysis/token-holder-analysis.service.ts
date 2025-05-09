import {
  TokenHolder,
  TokenPurchaseInfo,
  TrackedWalletHolderStats,
} from '@dyor-hub/types';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TokensService } from '../tokens/tokens.service';

export interface BirdeyeTokenTradeAssetDetail {
  symbol: string;
  address: string;
  decimals: number;
  price: number;
  amount: string;
  ui_amount: number;
  ui_change_amount: number;
}

export interface BirdeyeTokenTradeV3Item {
  tx_type: string;
  tx_hash: string;
  ins_index: number;
  block_unix_time: number;
  block_number: number;
  volume_usd: number;
  volume: number;
  owner: string;
  source: string;
  interacted_program_id: string;
  side: string;
  alias: string | null;
  price_pair: number;
  from: BirdeyeTokenTradeAssetDetail;
  to: BirdeyeTokenTradeAssetDetail;
  pool_id: string;
}

export interface BirdeyeTokenTradeV3Data {
  items: BirdeyeTokenTradeV3Item[];
  has_next: boolean;
}

export interface BirdeyeTokenTradeV3Response {
  data: BirdeyeTokenTradeV3Data;
  success: boolean;
}

@Injectable()
export class TokenHolderAnalysisService {
  private readonly logger = new Logger(TokenHolderAnalysisService.name);
  private readonly BIRDEYE_API_KEY =
    this.configService.get<string>('BIRDEYE_API_KEY');
  private readonly BIRDEYE_BASE_URL = 'https://public-api.birdeye.so';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
  ) {}

  async getTopHolderWalletActivity(
    tokenAddress: string,
  ): Promise<TrackedWalletHolderStats[]> {
    this.logger.log(`Fetching top holder activity for token: ${tokenAddress}`);

    // Fetch token creation time and total supply
    const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
    if (!tokenEntity) {
      throw new NotFoundException(`Token ${tokenAddress} not found.`);
    }

    const tokenCreationTime = tokenEntity.creationTime
      ? Math.floor(tokenEntity.creationTime.getTime() / 1000)
      : null;

    if (tokenCreationTime === null) {
      this.logger.warn(`Token ${tokenAddress} does not have a creationTime.`);
      throw new InternalServerErrorException(
        `Missing creation time for token ${tokenAddress}.`,
      );
    }

    const overviewData =
      await this.tokensService.fetchTokenOverview(tokenAddress);
    const tokenTotalSupply = overviewData?.totalSupply;

    if (typeof tokenTotalSupply !== 'number') {
      this.logger.warn(
        `Could not determine total supply for token ${tokenAddress}. Overview data: ${JSON.stringify(overviewData)}`,
      );
      throw new InternalServerErrorException(
        `Missing total supply for token ${tokenAddress}.`,
      );
    }

    const topHolders: TokenHolder[] =
      await this.tokensService.fetchTopHolders(tokenAddress); // fetchTopHolders uses overviewData for percentages
    if (!topHolders || topHolders.length === 0) {
      this.logger.warn(`No holders found for token ${tokenAddress}`);
      return [];
    }

    const walletsToAnalyze = topHolders.slice(0, 30);
    const analyzedWallets: TrackedWalletHolderStats[] = [];

    for (const holder of walletsToAnalyze) {
      const holderAddress = holder.address;
      this.logger.debug(
        `Analyzing wallet: ${holderAddress} for token: ${tokenAddress}`,
      );

      const allTradesForWallet: BirdeyeTokenTradeV3Item[] = [];
      let offset = 0;
      const limit = 100;
      let hasNextPage = true;

      while (hasNextPage) {
        try {
          const headers = { 'X-API-KEY': this.BIRDEYE_API_KEY };
          const params = {
            address: tokenAddress,
            owner: holderAddress,
            after_time: tokenCreationTime,
            before_time: Math.floor(Date.now() / 1000),
            sort_by: 'block_unix_time',
            sort_type: 'asc',
            limit,
            offset,
            tx_type: 'swap',
          };

          this.logger.debug(
            `Fetching trades for ${holderAddress}, offset: ${offset}`,
          );
          const response = await firstValueFrom(
            this.httpService.get<BirdeyeTokenTradeV3Response>(
              `${this.BIRDEYE_BASE_URL}/defi/v3/token/txs`,
              { headers, params },
            ),
          );

          if (response.data?.success && response.data.data?.items) {
            allTradesForWallet.push(...response.data.data.items);
            if (
              response.data.data.has_next &&
              response.data.data.items.length > 0
            ) {
              offset += limit;
            } else {
              hasNextPage = false;
            }
          } else {
            this.logger.warn(
              `No items or failed response for trades of ${holderAddress}, token ${tokenAddress}`,
            );
            hasNextPage = false;
          }
        } catch (error) {
          this.logger.error(
            `Error fetching trades for wallet ${holderAddress}, token ${tokenAddress}: ${error.message}`,
          );
          hasNextPage = false;
        }
      }
      this.logger.log(
        `Fetched ${allTradesForWallet.length} trades for wallet ${holderAddress}`,
      );

      const stats = this.processWalletTrades(
        holderAddress,
        allTradesForWallet,
        holder,
        tokenAddress,
        tokenTotalSupply,
      );
      if (stats) analyzedWallets.push(stats);
    }

    return analyzedWallets;
  }

  private processWalletTrades(
    walletAddress: string,
    trades: BirdeyeTokenTradeV3Item[],
    holderInfo: TokenHolder,
    trackedTokenAddress: string,
    tokenTotalSupply: number,
  ): TrackedWalletHolderStats | null {
    this.logger.debug(
      `Processing ${trades.length} trades for wallet ${walletAddress}`,
    );

    const currentBalanceUi = holderInfo.amount;
    const percentageOfTotal =
      tokenTotalSupply > 0 ? (currentBalanceUi / tokenTotalSupply) * 100 : 0;

    if (trades.length === 0) {
      return {
        walletAddress,
        currentBalanceUi,
        currentBalanceRaw: holderInfo.amount.toString(),
        percentageOfTotalSupply: isFinite(percentageOfTotal)
          ? percentageOfTotal
          : 0,
        overallAverageBuyPriceUsd: 0,
        firstEverPurchase: null,
        purchaseRounds: [],
        lastSellOffTimestamp: undefined,
        currentHoldingDurationSeconds: undefined,
      };
    }

    let firstPurchase: TokenPurchaseInfo | null = null;
    let totalSpentUsd = 0;
    let totalTokensBoughtUi = 0;

    for (const trade of trades) {
      const isBuy =
        trade.side === 'buy' &&
        trade.to.address.toLowerCase() === trackedTokenAddress.toLowerCase() &&
        trade.owner.toLowerCase() === walletAddress.toLowerCase();

      if (isBuy) {
        const tokenAmountBought =
          trade.to.ui_amount > 0 ? trade.to.ui_amount : 0;
        const usdValueOfTrade = trade.volume_usd > 0 ? trade.volume_usd : 0;

        const pricePerToken =
          tokenAmountBought > 0 ? usdValueOfTrade / tokenAmountBought : 0;

        const purchase: TokenPurchaseInfo = {
          priceUsd: pricePerToken > 0 ? pricePerToken : trade.to.price || 0,
          timestamp: trade.block_unix_time,
          tokenAmountUi: tokenAmountBought,
          spentUsd: usdValueOfTrade,
        };

        if (!firstPurchase) {
          firstPurchase = { ...purchase };
        }
        totalSpentUsd += purchase.spentUsd;
        totalTokensBoughtUi += purchase.tokenAmountUi;
      }
    }

    const overallAverageBuyPrice =
      totalTokensBoughtUi > 0 ? totalSpentUsd / totalTokensBoughtUi : 0;

    return {
      walletAddress,
      currentBalanceUi,
      currentBalanceRaw: holderInfo.amount.toString(),
      percentageOfTotalSupply: isFinite(percentageOfTotal)
        ? percentageOfTotal
        : 0,
      overallAverageBuyPriceUsd: isNaN(overallAverageBuyPrice)
        ? 0
        : overallAverageBuyPrice,
      firstEverPurchase: firstPurchase,
      purchaseRounds: [],
      lastSellOffTimestamp: undefined,
      currentHoldingDurationSeconds: firstPurchase
        ? Math.floor(Date.now() / 1000) - firstPurchase.timestamp
        : undefined,
    };
  }
}
