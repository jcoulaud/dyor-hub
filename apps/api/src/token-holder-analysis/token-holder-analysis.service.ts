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
    effectiveCreditCost: number,
    isEligibleForFreeTier: boolean,
    sessionId?: string,
  ): Promise<{ message: string; analysisJobId?: string }> {
    const tokenAgeInMonths = await this.getTokenAgeInMonths(tokenAddress);

    // Run in the background
    this._performFullAnalysis(
      userId,
      tokenAddress,
      walletCount,
      effectiveCreditCost,
      isEligibleForFreeTier,
      tokenAgeInMonths,
      sessionId,
    ).catch((error) => {
      this.logger.error(
        `Unhandled error in _performFullAnalysis for user ${userId}, token ${tokenAddress}, session ${sessionId}: ${error.message}`,
        error.stack,
      );
      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: 0,
        totalWallets: walletCount,
        status: 'error',
        message: 'Analysis failed due to an unexpected internal error.',
        error: 'Internal Server Error',
        sessionId,
      });
      if (!isEligibleForFreeTier && effectiveCreditCost > 0) {
        this.creditsService
          .releaseReservedCredits(userId, effectiveCreditCost)
          .catch((releaseError) => {
            this.logger.error(
              `Failed to release credits (${effectiveCreditCost}) in _performFullAnalysis catch for user ${userId}, sessionId ${sessionId}: ${releaseError.message}`,
            );
          });
      }
    });

    return { message: 'Token holder analysis initiated successfully.' };
  }

  private async _performFullAnalysis(
    userId: string,
    tokenAddress: string,
    walletCount: WalletAnalysisCount,
    effectiveCreditCost: number,
    isEligibleForFreeTier: boolean,
    tokenAgeInMonths: number,
    sessionId?: string,
  ): Promise<void> {
    let finalAnalyzedWallets: TrackedWalletHolderStats[] = [];
    let analysisSuccessful = false;

    // Initial progress update: Preparing to analyze
    this.eventsGateway.sendAnalysisProgress(userId, {
      currentWallet: 0,
      totalWallets: walletCount,
      status: 'analyzing',
      message: `Preparing to analyze ${walletCount} wallets...`,
      sessionId,
    });

    try {
      const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
      if (!tokenEntity) {
        throw new NotFoundException(`Token ${tokenAddress} not found.`);
      }

      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: 0,
        totalWallets: walletCount,
        status: 'analyzing',
        message: 'Fetching token overview data...',
        sessionId,
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
        this.eventsGateway.sendAnalysisProgress(userId, {
          currentWallet: 0,
          totalWallets: walletCount,
          status: 'complete',
          message: 'No top holders found for this token.',
          sessionId,
          analysisData: [],
        });
        if (!isEligibleForFreeTier && effectiveCreditCost > 0) {
          await this.creditsService.releaseReservedCredits(
            userId,
            effectiveCreditCost,
          );
        }
        return;
      } else {
        const walletsToAnalyze = topHolders.slice(0, walletCount);

        const batchSize = 3;

        for (let i = 0; i < walletsToAnalyze.length; i += batchSize) {
          const currentBatch = walletsToAnalyze.slice(i, i + batchSize);

          const analysisPromises = currentBatch.map(
            async (holder, batchIndex) => {
              const walletIndex = i + batchIndex;
              const holderAddress = holder.address;

              this.eventsGateway.sendAnalysisProgress(userId, {
                currentWallet: walletIndex + 1,
                totalWallets: walletsToAnalyze.length,
                currentWalletAddress: holderAddress,
                tradesFound: 0,
                status: 'analyzing',
                message: `Wallet ${walletIndex + 1}/${walletsToAnalyze.length} (${holderAddress.substring(0, 6)}...): Initializing...`,
                sessionId,
              });

              const tradeStats = await this._fetchWalletTradeHistoryInChunks(
                userId,
                tokenAddress,
                holderAddress,
                new Date(tokenCreationTime * 1000),
                tokenAgeInMonths,
                walletIndex,
                walletsToAnalyze.length,
                sessionId,
              );

              if (tradeStats.length === 0) {
                this.eventsGateway.sendAnalysisProgress(userId, {
                  currentWallet: walletIndex + 1,
                  totalWallets: walletsToAnalyze.length,
                  status: 'complete',
                  message: 'No trades found for this wallet.',
                  sessionId,
                });
                const emptyStat = this.processWalletTrades(
                  holderAddress,
                  [],
                  holder,
                  tokenAddress,
                  tokenTotalSupply,
                );
                return emptyStat;
              }

              const analyzedWalletData = this.processWalletTrades(
                holderAddress,
                tradeStats,
                holder,
                tokenAddress,
                tokenTotalSupply,
              );

              this.eventsGateway.sendAnalysisProgress(userId, {
                currentWallet: walletIndex + 1,
                totalWallets: walletsToAnalyze.length,
                currentWalletAddress: holderAddress,
                tradesFound: tradeStats.length,
                status: 'analyzing',
                message: `Wallet ${walletIndex + 1}/${walletsToAnalyze.length} (${holderAddress.substring(0, 6)}...): Completed. ${tradeStats.length} trades processed.`,
                sessionId,
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
        analysisSuccessful = true;
      }

      // Credits are already deducted in the controller, so no need to commit reserved credits
      if (isEligibleForFreeTier) {
        this.logger.log(
          `Holder analysis for user ${userId}, token ${tokenAddress}, session ${sessionId} was free. No credits charged.`,
        );
      } else if (effectiveCreditCost > 0) {
        this.logger.log(
          `Holder analysis for user ${userId}, token ${tokenAddress}, session ${sessionId} completed. Credits (${effectiveCreditCost}) were already deducted.`,
        );
      }

      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: finalAnalyzedWallets.length,
        totalWallets: walletCount,
        status: 'complete',
        message: 'Analysis complete',
        analysisData: finalAnalyzedWallets,
        sessionId,
      });
    } catch (error) {
      this.logger.error(
        `Error during _performFullAnalysis for ${tokenAddress}, user ${userId}, session ${sessionId}: ${error.message}`,
        error.stack,
      );
      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet:
          finalAnalyzedWallets.length > 0 ? finalAnalyzedWallets.length : 0,
        totalWallets: walletCount,
        status: 'error',
        message:
          error.message ||
          'An error occurred during wallet analysis processing.',
        error: error.message || 'Processing Error',
        sessionId,
      });
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
    sessionId?: string,
  ): Promise<BirdeyeTokenTradeV3Item[]> {
    const allTrades: BirdeyeTokenTradeV3Item[] = [];
    let offset = 0;
    const limit = 100;
    let totalTradesFetchedForWallet = 0;

    const numberOfChunks = Math.max(
      1,
      Math.ceil(tokenAgeInMonths / this.CHUNK_DURATION_MONTHS),
    );

    for (let chunkIndex = 0; chunkIndex < numberOfChunks; chunkIndex++) {
      const chunkStartDate = new Date(
        oldestTransactionDate.getTime() +
          chunkIndex * this.CHUNK_DURATION_MONTHS * 30 * 24 * 60 * 60 * 1000,
      );
      // Ensure chunkEndDate does not exceed current time
      const potentialChunkEndDate = new Date(
        oldestTransactionDate.getTime() +
          (chunkIndex + 1) *
            this.CHUNK_DURATION_MONTHS *
            30 *
            24 *
            60 *
            60 *
            1000,
      );
      const chunkEndDate =
        potentialChunkEndDate > new Date() ? new Date() : potentialChunkEndDate;

      this.eventsGateway.sendAnalysisProgress(userId, {
        currentWallet: currentWalletIndex + 1,
        totalWallets: totalWalletsToAnalyze,
        currentWalletAddress: walletAddress,
        status: 'analyzing',
        message: `Wallet ${currentWalletIndex + 1}/${totalWalletsToAnalyze} (${walletAddress.substring(0, 6)}...): Fetching trades (Batch ${chunkIndex + 1}/${numberOfChunks})`,
        tradesFound: totalTradesFetchedForWallet,
        sessionId,
      });

      offset = 0;
      let fetchedTradesInCurrentApiPage = 0;
      let paginationPageNum = 1;

      do {
        fetchedTradesInCurrentApiPage = 0;
        const headers = {
          'X-API-KEY': this.configService.get<string>('BIRDEYE_API_KEY') || '',
        };
        const params = {
          address: tokenAddress,
          owner: walletAddress,
          after_time: Math.floor(chunkStartDate.getTime() / 1000),
          before_time: Math.floor(chunkEndDate.getTime() / 1000),
          sort_by: 'block_unix_time',
          sort_type: 'desc', // Get newest first within the chunk
          limit,
          offset,
          tx_type: 'swap',
        };

        try {
          const response = await firstValueFrom(
            this.httpService.get<BirdeyeTokenTradeV3Response>(
              `${this.BIRDEYE_API_BASE}/defi/v3/token/txs`,
              { headers, params, timeout: 30000 },
            ),
          );

          if (response.data?.success && response.data.data?.items) {
            const newItems = response.data.data.items;
            allTrades.push(...newItems);
            fetchedTradesInCurrentApiPage = newItems.length;
            totalTradesFetchedForWallet += newItems.length;

            this.eventsGateway.sendAnalysisProgress(userId, {
              currentWallet: currentWalletIndex + 1,
              totalWallets: totalWalletsToAnalyze,
              currentWalletAddress: walletAddress,
              status: 'analyzing',
              message: `Wallet ${currentWalletIndex + 1}/${totalWalletsToAnalyze} (${walletAddress.substring(0, 6)}...): Found ${totalTradesFetchedForWallet} trades... (Batch ${chunkIndex + 1}/${numberOfChunks}, Page ${paginationPageNum})`,
              tradesFound: totalTradesFetchedForWallet,
              sessionId,
            });

            if (newItems.length < limit) {
              break;
            }
            offset += limit;
            paginationPageNum++;
          } else {
            break;
          }
        } catch (error) {
          this.logger.error(
            `[SESSION:${sessionId}] [WALLET:${walletAddress}] Chunk ${chunkIndex + 1}, Page ${paginationPageNum}: Birdeye API call FAILED. Error: ${error.message}. Ending pagination for this chunk.`,
            error.stack,
          );
          this.eventsGateway.sendAnalysisProgress(userId, {
            currentWallet: currentWalletIndex + 1,
            totalWallets: totalWalletsToAnalyze,
            currentWalletAddress: walletAddress,
            status: 'analyzing',
            message: `Wallet ${currentWalletIndex + 1}/${totalWalletsToAnalyze} (${walletAddress.substring(0, 6)}...): Error fetching trades (Batch ${chunkIndex + 1}/${numberOfChunks}, Page ${paginationPageNum}). Some data may be missing. Error: ${error.message}`,
            tradesFound: totalTradesFetchedForWallet,
            sessionId,
          });
          break;
        }
      } while (
        fetchedTradesInCurrentApiPage > 0 &&
        fetchedTradesInCurrentApiPage === limit
      );
    }

    return allTrades;
  }
}
