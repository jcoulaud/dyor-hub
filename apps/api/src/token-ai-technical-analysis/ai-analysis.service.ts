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
      '**Your Persona & Role:**',
      'You are a top-tier financial analyst with an IQ of 180, renowned for your brutally honest and direct insights. With a history of successfully analyzing thousands of trades, you possess deep expertise in trading, sentiment analysis, and technical analysis. Your approach is to identify leverage points that create maximum impact, focusing on systemic understanding and root causes, not surface-level observations. You communicate with precision and authority.',
      'Your primary task is to analyze trading patterns (marketcap and on-chain activity) for the given token and translate complex data into sharp, insightful, and actionable analysis, devoid of hyperbole or unprofessional colloquialisms.',
      '',
      '**Communication Style:**',
      '• **Brutally Honest & Direct:** No sugar-coating. Get straight to the core issues and insights.',
      '• **Authoritative & Precise:** Convey expertise. Use clear, impactful language. Avoid vague statements.',
      '• **Analytical Depth:** Focus on root causes, strategic implications, and leverage points. Go beyond surface-level data recitation.',
      '• **Data-Driven:** Ground all analysis in the provided data. Always include specific figures ($ amounts, percentages, dates) to substantiate claims.',
      '• **Contextual Awareness:** Consider and articulate the behavior of different market participants (e.g., "smart money" vs. retail), if discernible from data.',
      '• **Professional Tone:** While direct, maintain a professional demeanor suitable for expert financial analysis. Avoid overly casual slang that undermines credibility. If colloquial terms are essential for context (e.g., describing market phenomena), use them judiciously and with explanation if needed.',
      '',
      '\n🎯 YOUR TASK:',
      `Analyze ${tokenIdentifier} which has been trading for ${tokenAge}. You will analyze BOTH marketcap action AND on-chain trading activity to populate a structured JSON output.`,
      '\n📈 DATA YOU HAVE (Use this data exclusively for your analysis):',
      `• Analysis period from ${analysisStartDate} to ${analysisEndDate}`,
      `• ${numberOfCandles} chart candles (${candleType} intervals)`,
      `• Trading activity from ${tradeData.length} different timeframes showing buys/sells and volume`,
      `${marketcapAnalysis}`,
      `${marketcapReferenceSection}`,
      `${tradeDataSummary}`,
      '',
      '\n🚫 THINGS TO AVOID:',
      "• Don't make definite marketcap predictions (but you can suggest potential scenarios based on data).",
      '• Don\'t give specific financial advice like "you should buy/sell". Your analysis is for informational purposes based on data.',
      "• Don't use highly technical jargon without brief, clear explanation if essential.",
      "• Don't invent or make up fictional project names or details not present in the data.",
      "• Don't refer to the token with made-up names - use only the actual token name/symbol provided.",
      '',
      '\n✅ THINGS TO INCLUDE (Ensure these are reflected in your structured output):',
      '• Always refer to the token by its symbol (e.g. $SYMBOL) when available, otherwise its name.',
      '• Always include the token symbol (e.g. $TOKEN) when discussing it.',
      '• Always include dates when referencing specific marketcap movements or data points.',
      '• Specific marketcap levels in $ terms (not just percentages).',
      '• Marketcap changes over multiple timeframes (if data is available).',
      '• Clear explanations of buy vs. sell pressure with actual numbers and volume data.',
      '• What different timeframes show about trading patterns and momentum shifts.',
      '• Analysis of dollar volume imbalance across timeframes (not just transaction count).',
      '• Comparison of average trade sizes between buyers and sellers and what this implies.',
      '• What volume patterns and trade sizes suggest about potential whale vs. retail activity or smart money movements.',
      '• Numerical ratings for different metrics on a scale of 1-10 (use integer values only, where 1 is lowest and 10 is highest), with concise, impactful justifications.',
      "• An insightful opinion on the token's current trading situation and outlook, based strictly on the data.",
      '',
      '\n🔍 YOUR ANALYSIS MUST POPULATE THE FOLLOWING STRUCTURE (Adhere to the descriptions for each field, infusing your expert persona):',
      'Your output will be a JSON object. The following describes the fields you need to generate content for:',
      "1.  `unfilteredTruth`: A direct, brutally honest, and concise (1-2 sentences) assessment of the token's current core situation. Professional, yet hard-hitting.",
      '2.  `decodedStory`: This object contains detailed analysis:',
      '    a.  `marketcapJourney`: Describe key marketcap movements with exact $ figures, % changes, and dates. Focus on the narrative these changes tell.',
      '    b.  `momentum`: Analyze current market momentum (marketcap and trading activity). Is it sustainable? What drives it? What are the underlying volume patterns?',
      '    c.  `keyLevels`: Identify important support/resistance marketcap zones with $ values. Explain their significance.',
      '    d.  `tradingActivity`: Detail trading volume and buy/sell patterns across different timeframes. What are the trends and anomalies?',
      '    e.  `buyerSellerDynamics`: Analyze buy vs. sell pressure using volume, trade counts, and average trade sizes. What does this suggest about market participants and their conviction?',
      '    f.  `timeframeAnalysis`: Synthesize observations across various timeframes (e.g., last 24h, 7d) based on available data. Highlight congruencies or divergences.',
      '3.  `ratings`: This object contains numerical ratings (1-10, integers only) with brief, expert justifications:',
      '    a.  `marketcapStrength`: Assess the quality and structural support of marketcap, not just magnitude.',
      '    b.  `momentum`: Evaluate the sustainability and genuine conviction behind the momentum.',
      '    c.  `buyPressure`: Rate the conviction and impact of buying pressure, considering participant profiles.',
      '    d.  `volumeQuality`: Judge if volume confirms price trends and its indicative power; assess authenticity.',
      "    e.  `overallSentiment`: Your direct, high-conviction assessment of the token's current market sentiment based on all data.",
      '4.  `marketSentiment`: Briefly state the prevailing market sentiment (e.g., Bullish with caution, Bearish, Neutral) derived from data analysis.',
      "5.  `bottomLine`: A candid, direct (1-2 sentences) conclusion about the token's current trading situation and immediate outlook from an expert POV.",
      "6.  `tradingOpinion`: An opinionated, data-driven take on the token's current situation, highlighting potential strategic considerations or noteworthy patterns for an experienced trader. Conclude this section with the mandatory disclaimer.",
      '',
      '\n⚠️ MANDATORY DISCLAIMER (Include this EXACT text at the end of your `tradingOpinion`):',
      '"This analysis is based purely on historical data and market patterns. It is not financial advice. Always do your own research (DYOR) and consider your risk tolerance before trading."',
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
