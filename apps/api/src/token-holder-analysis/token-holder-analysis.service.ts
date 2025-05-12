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
import { CreditsService } from '../credits/credits.service';
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
    private readonly creditsService: CreditsService,
  ) {}

  private async getTokenAgeInMonths(tokenAddress: string): Promise<number> {
    this.logger.log(`Fetching age for token: ${tokenAddress}`);
    const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
    if (tokenEntity && tokenEntity.creationTime) {
      const ageInMillis = Date.now() - tokenEntity.creationTime.getTime();
      const ageInMonths = ageInMillis / (1000 * 60 * 60 * 24 * (365.25 / 12));
      return ageInMonths;
    }
    this.logger.warn(
      `Could not determine creation time for ${tokenAddress}, assuming 0 months old for cost calculation.`,
    );
    return 0;
  }

  private calculateCreditCost(tokenAgeInMonths: number): number {
    const BASE_COST = 1;
    const costPerFullYear = 1;

    const fullYears = Math.floor(tokenAgeInMonths / 12);
    const cost = BASE_COST + fullYears * costPerFullYear;

    return Math.max(1, cost);
  }

  async getTopHolderWalletActivity(
    userId: string,
    tokenAddress: string,
  ): Promise<TrackedWalletHolderStats[]> {
    const tokenAgeInMonths = await this.getTokenAgeInMonths(tokenAddress);
    const creditCost = this.calculateCreditCost(tokenAgeInMonths);
    this.logger.log(
      `Credit cost for ${tokenAddress} (age: ${tokenAgeInMonths.toFixed(1)} months) is ${creditCost} credits.`,
    );

    await this.creditsService.deductCredits(
      userId,
      creditCost,
      `Token Holder Analysis for ${tokenAddress}`,
    );

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
      await this.tokensService.fetchTopHolders(tokenAddress);
    if (!topHolders || topHolders.length === 0) {
      return [];
    }

    const walletsToAnalyze = topHolders.slice(0, 20);
    const finalAnalyzedWallets: TrackedWalletHolderStats[] = [];
    const batchSize = 3;

    for (let i = 0; i < walletsToAnalyze.length; i += batchSize) {
      const currentBatch = walletsToAnalyze.slice(i, i + batchSize);

      const analysisPromises = currentBatch.map(async (holder) => {
        const holderAddress = holder.address;

        const allTradesForWalletUnsorted: BirdeyeTokenTradeV3Item[] = [];
        const timeChunkSizeSeconds = 29 * 24 * 60 * 60;
        let chunkBeforeTime = Math.floor(Date.now() / 1000);
        let chunkAfterTime = Math.max(
          tokenCreationTime,
          chunkBeforeTime - timeChunkSizeSeconds,
        );

        while (chunkBeforeTime > tokenCreationTime) {
          let offset = 0;
          const limit = 100;
          let hasNextPageInChunk = true;

          while (hasNextPageInChunk) {
            try {
              const headers = { 'X-API-KEY': this.BIRDEYE_API_KEY };
              const params = {
                address: tokenAddress,
                owner: holderAddress,
                after_time: chunkAfterTime,
                before_time: chunkBeforeTime,
                sort_by: 'block_unix_time',
                sort_type: 'desc',
                limit,
                offset,
                tx_type: 'swap',
              };

              const response = await firstValueFrom(
                this.httpService.get<BirdeyeTokenTradeV3Response>(
                  `${this.BIRDEYE_BASE_URL}/defi/v3/token/txs`,
                  { headers, params },
                ),
              );

              if (response.data?.success && response.data.data?.items) {
                allTradesForWalletUnsorted.push(...response.data.data.items);
                if (
                  response.data.data.has_next &&
                  response.data.data.items.length > 0 &&
                  response.data.data.items.length === limit
                ) {
                  offset += limit;
                } else {
                  hasNextPageInChunk = false;
                }
              } else {
                hasNextPageInChunk = false;
              }
            } catch (error) {
              this.logger.error(
                `Error fetching trades for ${holderAddress} in chunk [${new Date(chunkAfterTime * 1000).toISOString()}-${new Date(chunkBeforeTime * 1000).toISOString()}], offset ${offset}: ${error.message}`,
              );
              hasNextPageInChunk = false;
            }
          }

          if (chunkAfterTime === tokenCreationTime) {
            break;
          }
          chunkBeforeTime = chunkAfterTime;
          chunkAfterTime = Math.max(
            tokenCreationTime,
            chunkBeforeTime - timeChunkSizeSeconds,
          );
        }

        const allTradesForWalletSorted = [...allTradesForWalletUnsorted].sort(
          (a, b) => a.block_unix_time - b.block_unix_time,
        );

        try {
          return this.processWalletTrades(
            holderAddress,
            allTradesForWalletSorted,
            holder,
            tokenAddress,
            tokenTotalSupply,
          );
        } catch (processingError) {
          return null;
        }
      });

      const batchResults = await Promise.all(analysisPromises);
      finalAnalyzedWallets.push(
        ...(batchResults.filter(
          (stats) => stats !== null,
        ) as TrackedWalletHolderStats[]),
      );
    }

    return finalAnalyzedWallets;
  }

  private processWalletTrades(
    walletAddress: string,
    trades: BirdeyeTokenTradeV3Item[],
    holderInfo: TokenHolder,
    trackedTokenAddress: string,
    tokenTotalSupply: number,
  ): TrackedWalletHolderStats | null {
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
      totalUsdValueOfSales: 0,
      overallRealizedPnlUsd: 0,
      analyzedTokenTotalSupply: tokenTotalSupply,
      purchaseRounds: [],
      lastSellOffTimestamp: undefined,
      currentHoldingDurationSeconds: 0,
    };

    if (trades.length === 0) {
      statsOutput.analyzedTokenTotalSupply = tokenTotalSupply;
      return statsOutput;
    }

    trades.sort((a, b) => a.block_unix_time - b.block_unix_time);

    let calculatedBalanceUi = 0;
    const allPurchases: TokenPurchaseInfo[] = [];
    let activeRound: TrackedWalletPurchaseRound | null = null;
    let roundIdCounter = 1;
    let actualLastSellOffTime: number | undefined = undefined;
    let accumulatedTotalUsdFromSales = 0;

    const fifoPurchaseQueue: Array<{
      amountUi: number;
      priceUsd: number;
      spentUsd: number;
      timestamp: number;
    }> = [];

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
        const currentPurchasePrice = isFinite(pricePerToken)
          ? pricePerToken
          : trade.to.price || 0;

        const purchase: TokenPurchaseInfo = {
          priceUsd: currentPurchasePrice,
          timestamp: trade.block_unix_time,
          tokenAmountUi: tokenAmountBought,
          spentUsd: usdValueOfTrade,
          approxMarketCapAtPurchaseUsd: currentPurchasePrice * tokenTotalSupply,
          txHash: trade.tx_hash,
        };
        allPurchases.push(purchase);
        fifoPurchaseQueue.push({
          amountUi: tokenAmountBought,
          priceUsd: currentPurchasePrice,
          spentUsd: usdValueOfTrade,
          timestamp: purchase.timestamp,
        });

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
            realizedPnlUsd: 0,
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
        activeRound.averageBuyPriceUsd =
          activeRound.totalTokensBoughtUi > 0
            ? activeRound.totalUsdSpent / activeRound.totalTokensBoughtUi
            : 0;

        calculatedBalanceUi += tokenAmountBought;
      } else if (isSell) {
        let tokenAmountSold =
          trade.from.ui_amount > 0 ? trade.from.ui_amount : 0;
        const usdReceivedFromSale = trade.volume_usd > 0 ? trade.volume_usd : 0;
        if (tokenAmountSold === 0) continue;

        accumulatedTotalUsdFromSales += usdReceivedFromSale;
        let costOfSoldTokensThisTrade = 0;
        let remainingAmountToAccountForSale = tokenAmountSold;

        while (
          remainingAmountToAccountForSale > 0 &&
          fifoPurchaseQueue.length > 0
        ) {
          const earliestPurchase = fifoPurchaseQueue[0];
          const amountFromThisFifoEntry = Math.min(
            remainingAmountToAccountForSale,
            earliestPurchase.amountUi,
          );

          costOfSoldTokensThisTrade +=
            amountFromThisFifoEntry * earliestPurchase.priceUsd;

          earliestPurchase.amountUi -= amountFromThisFifoEntry;
          remainingAmountToAccountForSale -= amountFromThisFifoEntry;

          if (earliestPurchase.amountUi <= 0.000001) {
            fifoPurchaseQueue.shift();
          }
        }

        const pnlForThisSale = usdReceivedFromSale - costOfSoldTokensThisTrade;
        statsOutput.overallRealizedPnlUsd =
          (statsOutput.overallRealizedPnlUsd || 0) + pnlForThisSale;
        if (activeRound) {
          activeRound.realizedPnlUsd =
            (activeRound.realizedPnlUsd || 0) + pnlForThisSale;
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

    statsOutput.totalUsdValueOfSales = accumulatedTotalUsdFromSales;
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
    if (
      statsOutput.totalUsdValueOfSales &&
      !isFinite(statsOutput.totalUsdValueOfSales)
    )
      statsOutput.totalUsdValueOfSales = 0;
    if (
      statsOutput.overallRealizedPnlUsd &&
      !isFinite(statsOutput.overallRealizedPnlUsd)
    )
      statsOutput.overallRealizedPnlUsd = 0;

    statsOutput.purchaseRounds.forEach((round) => {
      if (!isFinite(round.averageBuyPriceUsd)) round.averageBuyPriceUsd = 0;
      if (
        round.holdingDurationSeconds &&
        !isFinite(round.holdingDurationSeconds)
      )
        round.holdingDurationSeconds = 0;
      if (round.realizedPnlUsd && !isFinite(round.realizedPnlUsd))
        round.realizedPnlUsd = 0;
      if (
        round.firstPurchaseInRound.approxMarketCapAtPurchaseUsd &&
        !isFinite(round.firstPurchaseInRound.approxMarketCapAtPurchaseUsd)
      ) {
        round.firstPurchaseInRound.approxMarketCapAtPurchaseUsd = 0;
      }
      round.subsequentPurchasesInRound.forEach((p) => {
        if (
          p.approxMarketCapAtPurchaseUsd &&
          !isFinite(p.approxMarketCapAtPurchaseUsd)
        )
          p.approxMarketCapAtPurchaseUsd = 0;
      });
    });
    if (
      statsOutput.firstEverPurchase &&
      statsOutput.firstEverPurchase.approxMarketCapAtPurchaseUsd &&
      !isFinite(statsOutput.firstEverPurchase.approxMarketCapAtPurchaseUsd)
    ) {
      statsOutput.firstEverPurchase.approxMarketCapAtPurchaseUsd = 0;
    }

    statsOutput.analyzedTokenTotalSupply = tokenTotalSupply;
    return statsOutput;
  }
}
