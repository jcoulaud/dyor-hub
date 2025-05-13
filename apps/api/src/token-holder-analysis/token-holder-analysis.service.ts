import {
  TokenHolder,
  TokenPurchaseInfo,
  TrackedWalletHolderStats,
  TrackedWalletPurchaseRound,
  WalletAnalysisCount,
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
import { EventsGateway } from '../events/events.gateway';
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
  private readonly BIRDEYE_API_BASE = 'https://public-api.birdeye.so';
  private readonly CHUNK_DURATION_MONTHS = 1;

  constructor(
    private readonly httpService: HttpService,
    private readonly tokensService: TokensService,
    private readonly creditsService: CreditsService,
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService,
  ) {}

  async calculateAnalysisCreditCost(
    tokenAddress: string,
    walletCount: WalletAnalysisCount,
  ): Promise<number> {
    const tokenAgeInMonths = await this.getTokenAgeInMonths(tokenAddress);
    return this.calculateCreditCost(tokenAgeInMonths, walletCount);
  }

  private calculateCreditCost(
    tokenAgeInMonths: number,
    walletCount: WalletAnalysisCount,
  ): number {
    const BASE_COST = 1;
    const walletCountFactor = 0.08;
    const ageFactor = Math.min(tokenAgeInMonths / 3, 4); // Cap age factor at 4x (12 months)

    // Calculate the cost based on wallet count and token age
    const cost =
      (BASE_COST + walletCount * walletCountFactor) * (1 + ageFactor);

    // Round up to ensure whole numbers
    return Math.ceil(cost);
  }

  private async getTokenAgeInMonths(tokenAddress: string): Promise<number> {
    const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
    if (!tokenEntity?.creationTime) {
      throw new NotFoundException(
        `Token ${tokenAddress} not found or missing creation time.`,
      );
    }

    const ageInMilliseconds = Date.now() - tokenEntity.creationTime.getTime();
    const ageInMonths = ageInMilliseconds / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    return Math.max(0, ageInMonths);
  }

  async getTopHolderWalletActivity(
    userId: string,
    tokenAddress: string,
    walletCount: WalletAnalysisCount = 20,
  ): Promise<{ message: string; analysisJobId?: string }> {
    const tokenAgeInMonths = await this.getTokenAgeInMonths(tokenAddress);
    const creditCost = this.calculateCreditCost(tokenAgeInMonths, walletCount);

    // Check and reserve credits first
    await this.creditsService.checkAndReserveCredits(userId, creditCost);

    // Run in the background
    this._performFullAnalysis(
      userId,
      tokenAddress,
      walletCount,
      creditCost,
      tokenAgeInMonths,
    ).catch((error) => {
      this.logger.error(
        `Unhandled error in _performFullAnalysis for user ${userId}, token ${tokenAddress}: ${error.message}`,
        error.stack,
      );
      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: 0,
        totalWallets: walletCount,
        status: 'error',
        message: 'Analysis failed due to an unexpected internal error.',
        error: 'Internal Server Error',
      });
      // Credits are released if the job fails before it can manage credits itself
      this.creditsService
        .releaseReservedCredits(userId, creditCost)
        .catch((releaseError) => {
          this.logger.error(
            `Failed to release credits after catastrophic failure for user ${userId}: ${releaseError.message}`,
          );
        });
    });

    this.eventsGateway.sendAnalysisProgress(userId, {
      currentWallet: 0,
      totalWallets: walletCount,
      status: 'analyzing',
      message: 'Analysis initiated...',
    });

    return { message: 'Token holder analysis initiated successfully.' };
  }

  private async _performFullAnalysis(
    userId: string,
    tokenAddress: string,
    walletCount: WalletAnalysisCount,
    creditCost: number,
    tokenAgeInMonths: number,
  ): Promise<void> {
    // Initial progress update: Preparing to analyze
    this.eventsGateway.sendAnalysisProgress(userId, {
      currentWallet: 0,
      totalWallets: walletCount,
      status: 'analyzing',
      message: `Preparing to analyze ${walletCount} wallets...`,
    });

    try {
      const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
      if (!tokenEntity) {
        throw new NotFoundException(`Token ${tokenAddress} not found.`);
      }

      // Fetch token overview for total supply
      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: 0,
        totalWallets: walletCount,
        status: 'analyzing',
        message: 'Fetching token overview data...',
      });
      const overviewData =
        await this.tokensService.fetchTokenOverview(tokenAddress);
      const tokenTotalSupply = overviewData?.totalSupply;

      if (typeof tokenTotalSupply !== 'number') {
        this.logger.error(
          `Missing or invalid total supply for token ${tokenAddress}. Overview data: ${JSON.stringify(overviewData)}`,
        );
        throw new InternalServerErrorException(
          `Missing or invalid total supply for token ${tokenAddress}. Cannot proceed with analysis.`,
        );
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

      const topHolders: TokenHolder[] =
        await this.tokensService.fetchTopHolders(tokenAddress, walletCount);
      if (!topHolders || topHolders.length === 0) {
        // Send complete with no data if no holders found
        this.eventsGateway.sendAnalysisProgress(userId, {
          currentWallet: 0,
          totalWallets: walletCount,
          status: 'complete',
          message: 'No top holders found for this token.',
        });
        // Commit credits even if no holders, as work (fetching holders) was done
        await this.creditsService.commitReservedCredits(
          userId,
          creditCost,
          `Token Holder Analysis (no holders) for ${tokenAddress} (${walletCount} wallets)`,
        );
        return;
      }

      const walletsToAnalyze = topHolders.slice(0, walletCount);
      const finalAnalyzedWallets: TrackedWalletHolderStats[] = [];
      const batchSize = 3;

      for (let i = 0; i < walletsToAnalyze.length; i += batchSize) {
        const currentBatch = walletsToAnalyze.slice(i, i + batchSize);

        const analysisPromises = currentBatch.map(
          async (holder, batchIndex) => {
            const walletIndex = i + batchIndex;
            const holderAddress = holder.address;

            // Initial message for *this* wallet (before fetching trades)
            this.eventsGateway.sendAnalysisProgress(userId, {
              currentWallet: walletIndex + 1,
              totalWallets: walletsToAnalyze.length,
              currentWalletAddress: holderAddress,
              tradesFound: 0,
              status: 'analyzing',
              message: `Wallet ${walletIndex + 1}/${walletsToAnalyze.length} (${holderAddress.substring(0, 6)}...): Initializing...`,
            });

            const tradeStats = await this._fetchWalletTradeHistoryInChunks(
              userId,
              tokenAddress,
              holderAddress,
              new Date(tokenCreationTime * 1000),
              tokenAgeInMonths,
              walletIndex,
              walletsToAnalyze.length,
            );

            if (tradeStats.length === 0) {
              // Send complete with no data if no trades found
              this.eventsGateway.sendAnalysisProgress(userId, {
                currentWallet: walletIndex + 1,
                totalWallets: walletsToAnalyze.length,
                status: 'complete',
                message: 'No trades found for this wallet.',
              });
              // Commit credits even if no trades, as work (fetching trades) was done
              await this.creditsService.commitReservedCredits(
                userId,
                creditCost,
                `Token Holder Analysis (no trades) for ${tokenAddress} (${walletIndex + 1}/${walletsToAnalyze.length})`,
              );
              return null;
            }

            const analyzedWalletData = this.processWalletTrades(
              holderAddress,
              tradeStats,
              holder,
              tokenAddress,
              tokenTotalSupply,
            );

            // Progress update after this wallet is fully processed
            this.eventsGateway.sendAnalysisProgress(userId, {
              currentWallet: walletIndex + 1,
              totalWallets: walletsToAnalyze.length,
              currentWalletAddress: holderAddress,
              tradesFound: tradeStats.length,
              status: 'analyzing',
              message: `Wallet ${walletIndex + 1}/${walletsToAnalyze.length} (${holderAddress.substring(0, 6)}...): Completed. ${tradeStats.length} trades processed.`, // Use tradeStats.length
            });

            return analyzedWalletData;
          },
        );

        const batchResults = await Promise.all(analysisPromises);
        finalAnalyzedWallets.push(
          ...batchResults.filter(
            (stats): stats is TrackedWalletHolderStats => stats !== null,
          ),
        );
      }

      // Commit the reserved credits after successful analysis
      await this.creditsService.commitReservedCredits(
        userId,
        creditCost,
        `Token Holder Analysis for ${tokenAddress} (${walletCount} wallets)`,
      );

      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: walletsToAnalyze.length, // All wallets processed
        totalWallets: walletsToAnalyze.length,
        status: 'complete',
        message: 'Analysis complete',
        analysisData: finalAnalyzedWallets,
      });
    } catch (error) {
      // Release the reserved credits on error
      await this.creditsService.releaseReservedCredits(userId, creditCost);

      this.eventsGateway.sendAnalysisProgress(userId, {
        status: 'error',
        error: error.message,
        message: 'Analysis failed',
        currentWallet: 0,
        totalWallets: walletCount,
      });

      this.logger.error(
        `Failed to analyze token ${tokenAddress} for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
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

  private async _fetchWalletTradeHistoryInChunks(
    userId: string,
    tokenAddress: string,
    walletAddress: string,
    oldestTransactionDate: Date,
    tokenAgeInMonths: number,
    currentWalletIndex: number,
    totalWalletsToAnalyze: number,
  ): Promise<BirdeyeTokenTradeV3Item[]> {
    const allTrades: BirdeyeTokenTradeV3Item[] = [];
    let offset = 0;
    const limit = 100;
    let currentPage = 1;
    let fetchedTradesInChunk = 0;
    let totalTradesFetchedForWallet = 0;

    const numberOfChunks = Math.max(
      1,
      Math.ceil(tokenAgeInMonths / this.CHUNK_DURATION_MONTHS),
    );

    for (let chunk = 0; chunk < numberOfChunks; chunk++) {
      const chunkEndDate = new Date(
        oldestTransactionDate.getTime() +
          (chunk + 1) * this.CHUNK_DURATION_MONTHS * 30 * 24 * 60 * 60 * 1000,
      );
      const chunkStartDate = new Date(
        oldestTransactionDate.getTime() +
          chunk * this.CHUNK_DURATION_MONTHS * 30 * 24 * 60 * 60 * 1000,
      );

      // Send progress: Starting a new chunk
      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: currentWalletIndex + 1,
        totalWallets: totalWalletsToAnalyze,
        currentWalletAddress: walletAddress,
        status: 'analyzing',
        message: `Wallet ${currentWalletIndex + 1}/${totalWalletsToAnalyze} (${walletAddress.substring(0, 6)}...): Fetching trades (batch ${chunk + 1}/${numberOfChunks})`,
        tradesFound: totalTradesFetchedForWallet,
      });

      offset = 0;
      currentPage = 1;
      fetchedTradesInChunk = 0;

      do {
        const headers = {
          'X-API-KEY': this.configService.get<string>('BIRDEYE_API_KEY') || '',
        };
        const params = {
          address: tokenAddress,
          owner: walletAddress,
          after_time: chunkStartDate.getTime() / 1000,
          before_time: chunkEndDate.getTime() / 1000,
          sort_by: 'block_unix_time',
          sort_type: 'desc',
          limit,
          offset,
          tx_type: 'swap',
        };

        const response = await firstValueFrom(
          this.httpService.get<BirdeyeTokenTradeV3Response>(
            `${this.BIRDEYE_API_BASE}/defi/v3/token/txs`,
            { headers, params, timeout: 30000 },
          ),
        );

        if (response.data?.success && response.data.data?.items) {
          const newItems = response.data.data.items;
          allTrades.push(...newItems);
          fetchedTradesInChunk = newItems.length;
          totalTradesFetchedForWallet += newItems.length;

          // Send progress: After fetching a page
          this.eventsGateway.sendAnalysisProgress(userId, {
            currentWallet: currentWalletIndex + 1,
            totalWallets: totalWalletsToAnalyze,
            currentWalletAddress: walletAddress,
            status: 'analyzing',
            message: `Wallet ${currentWalletIndex + 1}/${totalWalletsToAnalyze} (${walletAddress.substring(0, 6)}...): Found ${totalTradesFetchedForWallet} trades...`,
            tradesFound: totalTradesFetchedForWallet,
          });

          if (newItems.length < limit) break;
          offset += limit;
          currentPage++;
        } else {
          break;
        }
      } while (fetchedTradesInChunk > 0);
    }
    return allTrades;
  }
}
