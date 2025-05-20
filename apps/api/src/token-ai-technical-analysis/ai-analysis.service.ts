import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ChartAnalysisDto } from './dto/chart-analysis.dto';

const RatingSchema = z.object({
  score: z.number().int().describe('Rating score from 1-10'),
  explanation: z.string().describe('Brief explanation for this rating'),
});

const DecodedStorySchema = z.object({
  marketcapJourney: z
    .string()
    .describe(
      'Brief description of the key marketcap movements with exact $ figures and % changes.',
    ),
  momentum: z
    .string()
    .describe(
      'Analysis of current marketcap momentum including trading activity and volume patterns.',
    ),
  keyLevels: z
    .string()
    .describe('Important support/resistance marketcap zones with $ values.'),
  tradingActivity: z
    .string()
    .describe(
      'Detailed breakdown of trading volume and buy/sell patterns across different timeframes.',
    ),
  buyerSellerDynamics: z
    .string()
    .describe(
      'Analysis of buy vs sell pressure with detailed volume comparisons, trade sizes, and what they suggest about market participants.',
    ),
  timeframeAnalysis: z
    .string()
    .describe(
      'Analysis of what happened in each timeframe (like last 24h, last 7d, etc) based on available data.',
    ),
});

const RatingsSchema = z.object({
  marketcapStrength: RatingSchema.describe(
    'Rating for current marketcap strength',
  ),
  momentum: RatingSchema.describe('Rating for momentum'),
  buyPressure: RatingSchema.describe('Rating for buying pressure'),
  volumeQuality: RatingSchema.describe('Rating for volume quality'),
  overallSentiment: RatingSchema.describe(
    'Rating for overall market sentiment',
  ),
});

const ChartWhispererSchema = z
  .object({
    unfilteredTruth: z
      .string()
      .describe(
        'A direct, no-BS sentence summarizing the current marketcap action in casual language.',
      ),
    decodedStory: DecodedStorySchema.describe(
      'Detailed analysis sections written in casual, direct language.',
    ),
    ratings: RatingsSchema.describe(
      'Numerical ratings (1-10) for key trading metrics with brief explanations.',
    ),
    marketSentiment: z
      .string()
      .describe(
        'The overall mood based on marketcap action and trading patterns.',
      ),
    bottomLine: z
      .string()
      .describe(
        "A candid, direct conclusion about the token's current trading situation.",
      ),
    tradingOpinion: z
      .string()
      .describe(
        'An opinionated take on current trading opportunities, with appropriate disclaimers.',
      ),
  })
  .describe('The structured analysis from the Chart Whisperer AI.');

export type ChartWhispererOutput = z.infer<typeof ChartWhispererSchema>;

// Type definition for trade data received from TokenAiTechnicalAnalysisService
interface TradeDataByTimeframe {
  timeframe: string;
  data: {
    address: string;
    total_volume: number;
    total_volume_usd: number;
    volume_buy_usd: number;
    volume_sell_usd: number;
    volume_buy: number;
    volume_sell: number;
    total_trade: number;
    buy: number;
    sell: number;
  };
}

@Injectable()
export class AiAnalysisService {
  private llm: ChatOpenAI;
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }

    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0.7,
    });
  }

  private buildPrompt(
    input: ChartAnalysisDto,
    tradeData: TradeDataByTimeframe[],
  ): string {
    const {
      tokenName,
      tokenSymbol,
      tokenAddress,
      tokenAge,
      numberOfCandles,
      candleType,
      ohlcvDataJson,
      priceReferencesJson,
      timeFrom,
      timeTo,
      marketCap,
    } = input;

    // Parse OHLCV data to find min, max marketcaps and calculate % gain
    let minMarketcap = Infinity;
    let maxMarketcap = 0;
    let firstMarketcap = 0;
    let lastMarketcap = 0;
    let marketcapChangePercent = 0;
    let allTimeHighGainPercent = 0;
    let firstTimestamp = 0;
    let lastTimestamp = 0;
    let maxMarketcapTimestamp = 0;
    let minMarketcapTimestamp = 0;
    let ohlcvParsedData: any[] = [];

    try {
      ohlcvParsedData = JSON.parse(ohlcvDataJson);
      if (Array.isArray(ohlcvParsedData) && ohlcvParsedData.length > 0) {
        // If we have a current marketcap value, use it and calculate historical values
        // using relative price changes
        if (marketCap && marketCap > 0) {
          lastMarketcap = marketCap;
          const lastPrice = ohlcvParsedData[ohlcvParsedData.length - 1].c;
          firstTimestamp = ohlcvParsedData[0].unixTime;
          lastTimestamp = ohlcvParsedData[ohlcvParsedData.length - 1].unixTime;

          // Calculate first marketcap based on price ratio
          const firstPrice = ohlcvParsedData[0].o;
          firstMarketcap = marketCap * (firstPrice / lastPrice);

          let lowestPrice = Infinity;
          let highestPrice = 0;

          ohlcvParsedData.forEach((candle) => {
            if (candle.l < lowestPrice) {
              lowestPrice = candle.l;
              minMarketcapTimestamp = candle.unixTime;
            }
            if (candle.h > highestPrice) {
              highestPrice = candle.h;
              maxMarketcapTimestamp = candle.unixTime;
            }
          });

          // Calculate min and max marketcap based on price ratios
          minMarketcap = marketCap * (lowestPrice / lastPrice);
          maxMarketcap = marketCap * (highestPrice / lastPrice);

          marketcapChangePercent =
            ((lastMarketcap - firstMarketcap) / firstMarketcap) * 100;
          allTimeHighGainPercent =
            ((maxMarketcap - firstMarketcap) / firstMarketcap) * 100;
        } else {
          // Fallback to using price data if marketcap is not available
          const firstPrice = ohlcvParsedData[0].o;
          const lastPrice = ohlcvParsedData[ohlcvParsedData.length - 1].c;
          firstTimestamp = ohlcvParsedData[0].unixTime;
          lastTimestamp = ohlcvParsedData[ohlcvParsedData.length - 1].unixTime;

          // Use arbitrary base value for marketcap visualization
          const baseValue = 1000000;
          lastMarketcap = baseValue;
          firstMarketcap = baseValue * (firstPrice / lastPrice);

          ohlcvParsedData.forEach((candle) => {
            // Calculate min and max marketcap directly from candle low and high values
            if (candle.l < minMarketcap) {
              minMarketcap = baseValue * (candle.l / lastPrice);
              minMarketcapTimestamp = candle.unixTime;
            }
            if (candle.h > maxMarketcap) {
              maxMarketcap = baseValue * (candle.h / lastPrice);
              maxMarketcapTimestamp = candle.unixTime;
            }
          });

          marketcapChangePercent =
            ((lastMarketcap - firstMarketcap) / firstMarketcap) * 100;
          allTimeHighGainPercent =
            ((maxMarketcap - firstMarketcap) / firstMarketcap) * 100;
        }
      }
    } catch (error) {
      this.logger.error(`Error parsing OHLCV data: ${error.message}`);
    }

    // Format dates for better readability
    const formatDate = (timestamp: number): string => {
      return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const analysisStartDate = formatDate(timeFrom || firstTimestamp);
    const analysisEndDate = formatDate(timeTo || lastTimestamp);
    const firstMarketcapDate = formatDate(firstTimestamp);
    const lastMarketcapDate = formatDate(lastTimestamp);
    const maxMarketcapDate = formatDate(maxMarketcapTimestamp);
    const minMarketcapDate = formatDate(minMarketcapTimestamp);

    // Parse marketcap references
    let marketcapReferences: {
      period: string;
      price: number;
      timestamp: number;
      changePercent: number;
    }[] = [];

    try {
      if (priceReferencesJson) {
        marketcapReferences = JSON.parse(priceReferencesJson);
      }
    } catch (error) {
      this.logger.error(`Error parsing marketcap references: ${error.message}`);
    }

    // Build marketcap reference section
    const marketcapReferenceSection = marketcapReferences.length
      ? `\n📅 Marketcap Performance by Time Period:\n` +
        marketcapReferences
          .map((ref) => {
            const refDate = formatDate(ref.timestamp);
            // Convert price reference to marketcap reference if we have current marketcap
            let refMarketcap = ref.price;
            if (
              marketCap &&
              marketCap > 0 &&
              ohlcvParsedData &&
              ohlcvParsedData.length > 0
            ) {
              const lastPrice = ohlcvParsedData[ohlcvParsedData.length - 1].c;
              refMarketcap = marketCap * (ref.price / lastPrice);
            }

            return `• ${ref.period.charAt(0).toUpperCase() + ref.period.slice(1)} (${refDate}): $${Math.round(refMarketcap).toLocaleString()} (${ref.changePercent >= 0 ? '+' : ''}${ref.changePercent.toFixed(2)}% vs current)`;
          })
          .join('\n')
      : '';

    // Calculate trading statistics across timeframes
    let buySellRatio = 'unknown';
    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalBuyCount = 0;
    let totalSellCount = 0;
    let buyPercentage = 0;
    let sellPercentage = 0;
    let avgBuySize = 0;
    let avgSellSize = 0;
    let volumeRatioTrend = 'stable';

    if (tradeData.length > 0) {
      // Get buy/sell ratios for different timeframes to determine trend
      const timeframeRatios = tradeData.map((td) => {
        if (td.data.volume_sell_usd > 0) {
          return {
            timeframe: td.timeframe,
            ratio: td.data.volume_buy_usd / td.data.volume_sell_usd,
          };
        }
        return { timeframe: td.timeframe, ratio: 1 };
      });

      // Sort timeframes from most recent to oldest (assuming they're in order like 24h, 3d, 7d, etc.)
      const sortedRatios = [...timeframeRatios].sort((a, b) => {
        const timeframeOrder = {
          '30m': 1,
          '1h': 2,
          '2h': 3,
          '4h': 4,
          '8h': 5,
          '24h': 6,
          '3d': 7,
          '7d': 8,
        };
        return (
          (timeframeOrder[a.timeframe] || 99) -
          (timeframeOrder[b.timeframe] || 99)
        );
      });

      // Compare recent vs older ratios to determine trend
      if (sortedRatios.length >= 2) {
        const recentRatios = sortedRatios.slice(
          0,
          Math.ceil(sortedRatios.length / 2),
        );
        const olderRatios = sortedRatios.slice(
          Math.ceil(sortedRatios.length / 2),
        );

        const avgRecentRatio =
          recentRatios.reduce((sum, item) => sum + item.ratio, 0) /
          recentRatios.length;
        const avgOlderRatio =
          olderRatios.reduce((sum, item) => sum + item.ratio, 0) /
          olderRatios.length;

        if (avgRecentRatio > avgOlderRatio * 1.2) {
          volumeRatioTrend = 'improving';
        } else if (avgRecentRatio < avgOlderRatio * 0.8) {
          volumeRatioTrend = 'deteriorating';
        }
      }

      tradeData.forEach((td) => {
        totalBuyVolume += td.data.volume_buy_usd;
        totalSellVolume += td.data.volume_sell_usd;
        totalBuyCount += td.data.buy;
        totalSellCount += td.data.sell;
      });

      if (totalSellVolume > 0) {
        buySellRatio = (totalBuyVolume / totalSellVolume).toFixed(2);
      }

      const totalTrades = totalBuyCount + totalSellCount;
      if (totalTrades > 0) {
        buyPercentage = (totalBuyCount / totalTrades) * 100;
        sellPercentage = (totalSellCount / totalTrades) * 100;
      }

      avgBuySize = totalBuyCount > 0 ? totalBuyVolume / totalBuyCount : 0;
      avgSellSize = totalSellCount > 0 ? totalSellVolume / totalSellCount : 0;
    }

    // Create a summary of timeframe data
    const timeframeBreakdown = tradeData
      .map((td) => {
        const timeframe = td.timeframe;
        const buyCount = td.data.buy;
        const sellCount = td.data.sell;
        const totalCount = buyCount + sellCount;
        const buyPct = totalCount > 0 ? (buyCount / totalCount) * 100 : 0;
        const sellPct = totalCount > 0 ? (sellCount / totalCount) * 100 : 0;
        const buyVolumeUsd = td.data.volume_buy_usd;
        const sellVolumeUsd = td.data.volume_sell_usd;
        const totalVolumeUsd = td.data.total_volume_usd;

        // Calculate buy/sell volume percentages
        const buyVolumePct =
          totalVolumeUsd > 0 ? (buyVolumeUsd / totalVolumeUsd) * 100 : 0;
        const sellVolumePct =
          totalVolumeUsd > 0 ? (sellVolumeUsd / totalVolumeUsd) * 100 : 0;

        // Calculate buy/sell volume ratio
        const volumeRatio =
          sellVolumeUsd > 0 ? buyVolumeUsd / sellVolumeUsd : 0;

        // Calculate average transaction sizes
        const avgBuyTxSize = buyCount > 0 ? buyVolumeUsd / buyCount : 0;
        const avgSellTxSize = sellCount > 0 ? sellVolumeUsd / sellCount : 0;

        // Determine transaction size imbalance
        const txSizeImbalance =
          avgBuyTxSize > 0 && avgSellTxSize > 0
            ? `${avgBuyTxSize > avgSellTxSize ? 'Buyers' : 'Sellers'} making ${Math.abs(avgBuyTxSize / avgSellTxSize - 1).toFixed(2)}x larger trades`
            : 'No size comparison available';

        return `${timeframe} timeframe: 
• ${totalCount} trades (${buyCount} buys/${sellCount} sells, ${buyPct.toFixed(1)}%/${sellPct.toFixed(1)}%)
• $${totalVolumeUsd.toLocaleString()} total volume 
• Buy volume: $${buyVolumeUsd.toLocaleString()} (${buyVolumePct.toFixed(1)}%)
• Sell volume: $${sellVolumeUsd.toLocaleString()} (${sellVolumePct.toFixed(1)}%)
• Buy/Sell ratio: ${volumeRatio.toFixed(2)} (>1 means more buying pressure)
• Avg buy size: $${avgBuyTxSize.toFixed(2)} | Avg sell size: $${avgSellTxSize.toFixed(2)}
• ${txSizeImbalance}`;
      })
      .join('\n\n');

    const tradeDataSummary =
      tradeData.length > 0
        ? `\n🔍 Trade Data Analysis:\n` +
          `• Trade data from ${tradeData.length} timeframes: ${tradeData.map((td) => td.timeframe).join(', ')}\n` +
          `• Overall buy/sell ratio: ${buySellRatio} (higher = more buying pressure)\n` +
          `• Buy/sell ratio trend: ${volumeRatioTrend} (comparing recent vs. older timeframes)\n` +
          `• Trade composition: ${totalBuyCount.toLocaleString()} buys (${buyPercentage.toFixed(1)}%) vs ${totalSellCount.toLocaleString()} sells (${sellPercentage.toFixed(1)}%)\n` +
          `• Buy volume: $${totalBuyVolume.toLocaleString()} (${((totalBuyVolume / (totalBuyVolume + totalSellVolume)) * 100).toFixed(1)}% of total)\n` +
          `• Sell volume: $${totalSellVolume.toLocaleString()} (${((totalSellVolume / (totalBuyVolume + totalSellVolume)) * 100).toFixed(1)}% of total)\n` +
          `• Average buy size: $${avgBuySize.toFixed(2)}\n` +
          `• Average sell size: $${avgSellSize.toFixed(2)}\n` +
          `• Size comparison: ${avgBuySize > avgSellSize ? 'Buyers' : 'Sellers'} making ${Math.abs(avgBuySize / avgSellSize - 1).toFixed(2)}x larger trades on average\n` +
          `• Volume imbalance: ${totalBuyVolume > totalSellVolume ? `$${(totalBuyVolume - totalSellVolume).toLocaleString()} more buying` : `$${(totalSellVolume - totalBuyVolume).toLocaleString()} more selling`}\n\n` +
          `⏱️ Breakdown by timeframe:\n${timeframeBreakdown}`
        : '';

    // Format marketcap information
    const marketCapInfo = marketCap
      ? `• Market Cap: $${marketCap.toLocaleString()}\n`
      : '';

    const marketcapAnalysis =
      `\n📊 Marketcap Analysis:\n` +
      `• Analysis period: ${analysisStartDate} to ${analysisEndDate}\n` +
      `• Starting marketcap (${firstMarketcapDate}): $${Math.round(firstMarketcap).toLocaleString()}\n` +
      `• Current marketcap (${lastMarketcapDate}): $${Math.round(lastMarketcap).toLocaleString()}\n` +
      `• All-time high (${maxMarketcapDate}): $${Math.round(maxMarketcap).toLocaleString()}\n` +
      `• All-time low (${minMarketcapDate}): $${Math.round(minMarketcap).toLocaleString()}\n` +
      `• ATH gain: ${allTimeHighGainPercent > 0 ? '+' : ''}${allTimeHighGainPercent.toFixed(2)}%\n` +
      `• Net marketcap change: ${marketcapChangePercent > 0 ? '+' : ''}${marketcapChangePercent.toFixed(2)}%\n` +
      marketCapInfo;

    // Prepare token identifier - include symbol if available
    const tokenIdentifier = tokenSymbol
      ? `${tokenName} ($${tokenSymbol})`
      : `${tokenName} ($${tokenAddress.substring(0, 4)}...)`;

    const promptParts = [
      'Act as "SolanaPulse" - your job is to analyze Solana memecoin trading patterns and translate complex data into actionable insights.',
      '\n👋 YOUR STYLE:',
      '• Direct and casual, like a pro trader chatting at a bar - no corporate BS',
      '• Use casual language like "dumped," "pumped," "mooning," "rekt," etc.',
      '• Cut straight to what matters - be brutally honest',
      '• Talk about "smart money" vs "retail traders" behavior',
      '• Always include $ figures and % changes to make things concrete',
      '• Compare patterns across different timeframes when relevant',
      '\n🎯 YOUR TASK:',
      `Analyze ${tokenIdentifier} which has been trading for ${tokenAge}. You'll analyze BOTH marketcap action AND on-chain trading activity.`,
      '\n📈 DATA YOU HAVE:',
      `• Analysis period from ${analysisStartDate} to ${analysisEndDate}`,
      `• ${numberOfCandles} chart candles (${candleType} intervals)`,
      `• Trading activity from ${tradeData.length} different timeframes showing buys/sells and volume`,
      `${marketcapAnalysis}`,
      `${marketcapReferenceSection}`,
      `${tradeDataSummary}`,
      '\n🚫 THINGS TO AVOID:',
      "• Don't make definite marketcap predictions (but you can suggest potential scenarios)",
      '• Don\'t give specific financial advice like "you should buy/sell"',
      "• Don't use technical jargon without explaining it",
      "• Don't invent or make up fictional project names (e.g., 'Armstrong, Rohan, and Bode Token')",
      "• Don't refer to the token with made-up names - use only the actual token name",
      "• Don't use placeholder token name templates - refer to the token by its actual name",
      '\n✅ THINGS TO INCLUDE:',
      '• Always refer to the token by its symbol when available',
      '• Always include the token symbol (e.g. $TOKEN) in your analysis',
      '• Always include dates when referencing marketcap movements (e.g., "On May 5, 2023, the marketcap surged to...")',
      '• Specific marketcap levels in $ terms (not just percentages)',
      '• Marketcap changes over multiple timeframes (if data is available)',
      '• Clear explanations of buy vs. sell pressure with actual numbers',
      '• What different timeframes show about trading patterns',
      '• Analysis of dollar volume imbalance across timeframes (not just transaction count)',
      '• Comparison of average trade sizes between buyers and sellers',
      '• What volume patterns suggest about whale vs. retail activity',
      '• What "smart money" is doing vs retail traders',
      '• Ratings for different metrics on a scale of 1-10 (use integer values only, where 1 is lowest and 10 is highest)',
      '• Your opinion on if this token looks interesting or not',
      '\n🔍 YOUR ANALYSIS MUST INCLUDE:',
      '1. A brutally honest one-liner about the current situation',
      '2. Detailed breakdown of marketcap movements with $ figures and multiple timeframe comparisons',
      '3. Analysis of momentum based on BOTH marketcap action AND trading activity',
      '4. Key support/resistance levels with exact $ values',
      '5. Trading patterns across different timeframes',
      '6. Buy vs sell pressure dynamics with specifics about volume and trade sizes',
      '7. What the transaction size comparison suggests about market participants (whales vs retail)',
      '8. Numerical ratings (1-10, integers only) for key metrics with brief explanations',
      '9. An opinionated take on current trading outlook (with appropriate disclaimers)',
      '\n⚠️ DISCLAIMER:',
      'Make sure to include this disclaimer with your trading opinion: "This analysis is based purely on historical data and market patterns. It is not financial advice. Always do your own research (DYOR) and consider your risk tolerance before trading."',
    ];

    return promptParts.join('\n');
  }

  async getChartAnalysis(
    input: ChartAnalysisDto,
  ): Promise<ChartWhispererOutput> {
    let tradeData: TradeDataByTimeframe[] = [];

    // Parse trade data from the input
    if (input.tradeDataJson) {
      try {
        tradeData = JSON.parse(input.tradeDataJson);
      } catch (error) {
        this.logger.error(`Error parsing tradeDataJson: ${error.message}`);
      }
    }

    // Build prompt with the trade data
    const prompt = this.buildPrompt(input, tradeData);

    try {
      const llmWithSchema = this.llm.withStructuredOutput(ChartWhispererSchema);
      const analysis = await llmWithSchema.invoke(prompt);
      return analysis;
    } catch (error) {
      throw new Error(
        `Error getting structured analysis from LLM: ${error.message}`,
      );
    }
  }
}
