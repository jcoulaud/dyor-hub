import {
  TokenHolder,
  TokenPurchaseInfo,
  TrackedWalletHolderStats,
  TrackedWalletPurchaseRound,
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
      `Processing ${trades.length} trades for wallet ${walletAddress} for token ${trackedTokenAddress}`,
    );

    const statsOutput: TrackedWalletHolderStats = {
      walletAddress,
      currentBalanceUi: holderInfo.amount,
      currentBalanceRaw: holderInfo.amount.toString(),
      percentageOfTotalSupply:
        tokenTotalSupply > 0 && isFinite(holderInfo.amount / tokenTotalSupply)
          ? (holderInfo.amount / tokenTotalSupply) * 100
          : 0,
      overallAverageBuyPriceUsd: 0,
      firstEverPurchase: null,
      purchaseRounds: [],
      lastSellOffTimestamp: undefined,
      currentHoldingDurationSeconds: 0,
    };

    if (trades.length === 0) {
      return statsOutput;
    }

    trades.sort((a, b) => a.block_unix_time - b.block_unix_time);

    let calculatedBalanceUi = 0;
    const allPurchases: TokenPurchaseInfo[] = [];
    let activeRound: TrackedWalletPurchaseRound | null = null;
    let roundIdCounter = 1;
    let actualLastSellOffTime: number | undefined = undefined;

    for (const trade of trades) {
      const isBuy =
        trade.side === 'buy' &&
        trade.to.address.toLowerCase() === trackedTokenAddress.toLowerCase() &&
        trade.owner.toLowerCase() === walletAddress.toLowerCase();

      const isSell =
        trade.side === 'sell' &&
        trade.from.address.toLowerCase() ===
          trackedTokenAddress.toLowerCase() &&
        trade.owner.toLowerCase() === walletAddress.toLowerCase();

      if (!isBuy && !isSell) {
        continue;
      }

      if (isBuy) {
        const tokenAmountBought =
          trade.to.ui_amount > 0 ? trade.to.ui_amount : 0;
        const usdValueOfTrade = trade.volume_usd > 0 ? trade.volume_usd : 0;

        if (tokenAmountBought === 0) continue;

        const pricePerToken = usdValueOfTrade / tokenAmountBought;

        const purchase: TokenPurchaseInfo = {
          priceUsd: isFinite(pricePerToken)
            ? pricePerToken
            : trade.to.price || 0,
          timestamp: trade.block_unix_time,
          tokenAmountUi: tokenAmountBought,
          spentUsd: usdValueOfTrade,
        };

        allPurchases.push(purchase);
        if (!statsOutput.firstEverPurchase) {
          statsOutput.firstEverPurchase = { ...purchase };
        }

        if (!activeRound) {
          activeRound = {
            roundId: roundIdCounter++,
            firstPurchaseInRound: { ...purchase },
            subsequentPurchasesInRound: [],
            totalTokensBoughtUi: 0,
            totalUsdSpent: 0,
            averageBuyPriceUsd: 0,
            startTime: purchase.timestamp,
            soldAmountUi: 0,
            soldEverythingFromRound: false,
          };
          statsOutput.purchaseRounds.push(activeRound);
        }

        if (
          activeRound.firstPurchaseInRound.timestamp !== purchase.timestamp ||
          activeRound.totalTokensBoughtUi > 0
        ) {
          activeRound.subsequentPurchasesInRound.push(purchase);
        }

        activeRound.totalTokensBoughtUi += tokenAmountBought;
        activeRound.totalUsdSpent += usdValueOfTrade;
        if (activeRound.totalTokensBoughtUi > 0) {
          activeRound.averageBuyPriceUsd =
            activeRound.totalUsdSpent / activeRound.totalTokensBoughtUi;
        } else {
          activeRound.averageBuyPriceUsd = 0;
        }

        calculatedBalanceUi += tokenAmountBought;
      } else if (isSell) {
        const tokenAmountSold =
          trade.from.ui_amount > 0 ? trade.from.ui_amount : 0;
        if (tokenAmountSold === 0) continue;

        if (activeRound) {
          activeRound.soldAmountUi += tokenAmountSold;
        }

        calculatedBalanceUi -= tokenAmountSold;

        const epsilon = 0.000001;
        if (calculatedBalanceUi <= epsilon) {
          calculatedBalanceUi = 0;
          actualLastSellOffTime = trade.block_unix_time;

          if (activeRound) {
            activeRound.soldEverythingFromRound = true;
            activeRound.endTime = trade.block_unix_time;
            activeRound.holdingDurationSeconds =
              activeRound.endTime - activeRound.startTime;
            activeRound = null;
          }
        }
      }
    }

    statsOutput.lastSellOffTimestamp = actualLastSellOffTime;

    if (allPurchases.length > 0) {
      const totalUsdSpentOverall = allPurchases.reduce(
        (sum, p) => sum + p.spentUsd,
        0,
      );
      const totalTokensBoughtOverall = allPurchases.reduce(
        (sum, p) => sum + p.tokenAmountUi,
        0,
      );
      statsOutput.overallAverageBuyPriceUsd =
        totalTokensBoughtOverall > 0 &&
        isFinite(totalUsdSpentOverall / totalTokensBoughtOverall)
          ? totalUsdSpentOverall / totalTokensBoughtOverall
          : 0;
    }

    let currentHoldingPeriodStartTime: number | null = null;
    if (calculatedBalanceUi > 0) {
      if (actualLastSellOffTime) {
        const firstPurchaseAfterLastSellOff = allPurchases.find(
          (p) => p.timestamp > actualLastSellOffTime!,
        );
        if (firstPurchaseAfterLastSellOff) {
          currentHoldingPeriodStartTime =
            firstPurchaseAfterLastSellOff.timestamp;
        }
      } else if (statsOutput.firstEverPurchase) {
        currentHoldingPeriodStartTime = statsOutput.firstEverPurchase.timestamp;
      }
    }

    if (currentHoldingPeriodStartTime !== null) {
      statsOutput.currentHoldingDurationSeconds =
        Math.floor(Date.now() / 1000) - currentHoldingPeriodStartTime;
    } else {
      statsOutput.currentHoldingDurationSeconds = 0;
    }

    if (!isFinite(statsOutput.percentageOfTotalSupply))
      statsOutput.percentageOfTotalSupply = 0;
    if (!isFinite(statsOutput.overallAverageBuyPriceUsd))
      statsOutput.overallAverageBuyPriceUsd = 0;
    statsOutput.purchaseRounds.forEach((round) => {
      if (!isFinite(round.averageBuyPriceUsd)) round.averageBuyPriceUsd = 0;
      if (
        round.holdingDurationSeconds &&
        !isFinite(round.holdingDurationSeconds)
      )
        round.holdingDurationSeconds = 0;
    });

    return statsOutput;
  }
}
