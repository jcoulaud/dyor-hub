import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TokensService } from '../tokens/tokens.service';
import { AiAnalysisService, ChartWhispererOutput } from './ai-analysis.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { ChartAnalysisDto } from './dto/chart-analysis.dto';

const BIRDEYE_OHLCV_ENDPOINT = 'https://public-api.birdeye.so/defi/ohlcv';
const BIRDEYE_TRADES_ENDPOINT =
  'https://public-api.birdeye.so/defi/v3/all-time/trades/single';
const MAX_BIRDEYE_CANDLES = 950;

const BIRDEYE_TIMEFRAMES = [
  '30m',
  '1h',
  '2h',
  '4h',
  '8h',
  '24h',
  '3d',
  '7d',
  '14d',
  '30d',
  '90d',
  '180d',
  '1y',
  'alltime',
];

// Map timeframes to their approximate duration in seconds
const TIMEFRAME_DURATIONS = {
  '30m': 30 * 60,
  '1h': 60 * 60,
  '2h': 2 * 60 * 60,
  '4h': 4 * 60 * 60,
  '8h': 8 * 60 * 60,
  '24h': 24 * 60 * 60,
  '3d': 3 * 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '14d': 14 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
  '90d': 90 * 24 * 60 * 60,
  '180d': 180 * 24 * 60 * 60,
  '1y': 365 * 24 * 60 * 60,
  alltime: Infinity,
};

interface BirdeyeOhlcvParams {
  address: string;
  type: string;
  time_from: number;
  time_to: number;
}

interface BirdeyeTradeParams {
  address: string;
  time_frame: string;
}

interface BirdeyeTradeData {
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
}

interface BirdeyeTradeResponse {
  data: BirdeyeTradeData[];
  success: boolean;
}

interface BirdeyeOhlcvItem {
  unixTime: number;
  type: string;
  c: number;
  h: number;
  l: number;
  o: number;
  v: number;
  address: string;
  currency: string;
}

interface BirdeyeOhlcvResponse {
  data: {
    items: BirdeyeOhlcvItem[];
  };
  success: boolean;
}

interface TradeDataByTimeframe {
  timeframe: string;
  data: BirdeyeTradeData;
}

const BIRDEYE_CANDLE_TYPES = [
  { type: '1m', seconds: 60 },
  { type: '3m', seconds: 3 * 60 },
  { type: '5m', seconds: 5 * 60 },
  { type: '15m', seconds: 15 * 60 },
  { type: '30m', seconds: 30 * 60 },
  { type: '1H', seconds: 60 * 60 },
  { type: '2H', seconds: 2 * 60 * 60 },
  { type: '4H', seconds: 4 * 60 * 60 },
  { type: '6H', seconds: 6 * 60 * 60 },
  { type: '12H', seconds: 12 * 60 * 60 },
  { type: '1D', seconds: 24 * 60 * 60 },
  { type: '3D', seconds: 3 * 24 * 60 * 60 },
  { type: '1W', seconds: 7 * 24 * 60 * 60 },
];

export interface OrchestrationResult {
  analysisOutput: ChartWhispererOutput;
}

export interface CostAndPreliminaryData {
  tokenName: string;
  tokenAgeInDays: number;
}

@Injectable()
export class TokenAiTechnicalAnalysisService {
  private readonly logger = new Logger(TokenAiTechnicalAnalysisService.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly aiAnalysisService: AiAnalysisService,
  ) {}

  async getTokenAgeInDays(tokenAddress: string): Promise<number> {
    const tokenEntity = await this.tokensService.getTokenData(tokenAddress);
    if (!tokenEntity?.creationTime) {
      this.logger.warn(
        `Token ${tokenAddress} not found or missing creation time for age calculation.`,
      );
      throw new NotFoundException(
        `Token data for ${tokenAddress} not found or missing creation time for cost calculation.`,
      );
    }
    const ageInMilliseconds = Date.now() - tokenEntity.creationTime.getTime();
    const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
    return Math.max(0, ageInDays);
  }

  // Method to select appropriate timeframes based on date range and token age
  private selectOptimalTimeframes(
    timeFromSeconds: number,
    timeToSeconds: number,
    tokenAgeInDays: number = Infinity,
  ): string[] {
    // Calculate the duration of the selected date range in seconds
    const durationSeconds = timeToSeconds - timeFromSeconds;

    // Calculate token age in seconds
    const tokenAgeSeconds = tokenAgeInDays * 24 * 60 * 60;

    // Filter available timeframes based on the selected duration and token age
    const applicableTimeframes = BIRDEYE_TIMEFRAMES.filter((timeframe) => {
      const timeframeDuration =
        TIMEFRAME_DURATIONS[timeframe as keyof typeof TIMEFRAME_DURATIONS];

      // Don't include timeframes that are longer than our date range
      // We use 1.5x to allow for some overlap while still being meaningful
      if (
        timeframe !== 'alltime' &&
        timeframeDuration > durationSeconds * 1.5
      ) {
        return false;
      }

      // Don't include timeframes longer than the token's age
      if (timeframe !== 'alltime' && timeframeDuration > tokenAgeSeconds) {
        return false;
      }

      return true;
    });

    // If no appropriate timeframes are found or the token is very new, just use the shortest timeframes
    if (applicableTimeframes.length === 0 || tokenAgeInDays < 1) {
      // For very new tokens, focus on shortest timeframes
      return BIRDEYE_TIMEFRAMES.slice(0, 5).filter((tf) => {
        const tfDuration =
          TIMEFRAME_DURATIONS[tf as keyof typeof TIMEFRAME_DURATIONS];
        return tfDuration < Math.max(durationSeconds, 24 * 60 * 60); // At least include timeframes up to 1 day
      });
    }

    // For very short date ranges, we might want to focus on shorter timeframes
    if (durationSeconds < 24 * 60 * 60) {
      // Less than 1 day
      return applicableTimeframes.slice(0, 5); // Take up to 5 shortest timeframes
    }

    // We want to select 5 well-distributed timeframes
    const result: string[] = [];
    const totalTimeframes = applicableTimeframes.length;

    // If we have 5 or fewer, use all of them
    if (totalTimeframes <= 5) {
      return applicableTimeframes;
    }

    // Otherwise, pick 5 evenly distributed timeframes
    const step = Math.max(1, Math.floor(totalTimeframes / 5));

    for (let i = 0; i < 5; i++) {
      const index = Math.min(i * step, totalTimeframes - 1);
      result.push(applicableTimeframes[index]);
    }

    // Ensure we have unique timeframes and at most 5
    return Array.from(new Set(result)).slice(0, 5);
  }

  async fetchTradeData(
    tokenAddress: string,
    timeFrom: number,
    timeTo: number,
    tokenAgeInDays: number,
    progress?: (percent: number, stage: string) => void,
  ): Promise<TradeDataByTimeframe[]> {
    const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!birdeyeApiKey) {
      this.logger.warn('Missing Birdeye API key for trade data');
      return [];
    }

    // Select optimal timeframes based on date range and token age
    const selectedTimeframes = this.selectOptimalTimeframes(
      timeFrom,
      timeTo,
      tokenAgeInDays,
    );

    const tradeDataResults: TradeDataByTimeframe[] = [];
    const totalTimeframes = selectedTimeframes.length;

    try {
      for (let i = 0; i < selectedTimeframes.length; i++) {
        const timeframe = selectedTimeframes[i];

        // Report progress if callback provided
        if (progress) {
          const percentComplete = 15 + Math.round((i / totalTimeframes) * 25); // Progress from 15% to 40%
          progress(percentComplete, `Fetching ${timeframe} trade data...`);
        }

        try {
          const params: BirdeyeTradeParams = {
            address: tokenAddress,
            time_frame: timeframe,
          };

          const response = await firstValueFrom(
            this.httpService.get<BirdeyeTradeResponse>(
              BIRDEYE_TRADES_ENDPOINT,
              {
                headers: { 'X-API-KEY': birdeyeApiKey },
                params,
              },
            ),
          );

          if (
            response.data?.success &&
            response.data.data &&
            response.data.data.length > 0
          ) {
            tradeDataResults.push({
              timeframe,
              data: response.data.data[0],
            });

            // Add a small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching ${timeframe} trade data for ${tokenAddress}: ${error.message}`,
          );
          // Continue with other timeframes even if one fails
        }
      }

      return tradeDataResults;
    } catch (error) {
      this.logger.error(
        `Failed to fetch trade data for ${tokenAddress}: ${error.message}`,
      );
      return [];
    }
  }

  async prepareAndExecuteAnalysis(
    requestDto: AiAnalysisRequestDto,
    tokenName: string,
    tokenAgeInDays: number,
    progressCallback?: (percent: number, stage: string) => void,
    marketCap?: number,
  ): Promise<OrchestrationResult> {
    const {
      tokenAddress,
      timeFrom: clientTimeFrom,
      timeTo: clientTimeTo,
    } = requestDto;

    if (clientTimeFrom >= clientTimeTo) {
      throw new BadRequestException('timeFrom must be earlier than timeTo.');
    }

    // Report initial progress
    if (progressCallback) {
      progressCallback(10, 'Determining optimal data resolution...');
    }

    // Fetch complete token data to get the symbol
    const tokenData = await this.tokensService.getTokenData(tokenAddress);
    const tokenSymbol = tokenData?.symbol || '';

    const { ohlcvType } = this.determineOhlcvType(clientTimeFrom, clientTimeTo);

    let ohlcvItems: BirdeyeOhlcvItem[] = [];

    try {
      // Report progress
      if (progressCallback) {
        progressCallback(15, 'Fetching price chart data...');
      }

      const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
      if (!birdeyeApiKey) {
        throw new InternalServerErrorException('Service configuration error.');
      }
      const params: BirdeyeOhlcvParams = {
        address: tokenAddress,
        type: ohlcvType,
        time_from: clientTimeFrom,
        time_to: clientTimeTo,
      };

      const response = await firstValueFrom(
        this.httpService.get<BirdeyeOhlcvResponse>(BIRDEYE_OHLCV_ENDPOINT, {
          headers: { 'X-API-KEY': birdeyeApiKey },
          params,
        }),
      );

      if (!response.data?.success || !response.data?.data?.items) {
        if (!response.data?.success) {
          throw new NotFoundException(
            'Could not retrieve OHLCV market data. Birdeye request unsuccessful.',
          );
        }
      } else {
        ohlcvItems = response.data.data.items;
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Failed to retrieve market data for analysis.',
      );
    }

    // Generate price references for different time periods
    const priceReferences = this.generatePriceReferences(
      ohlcvItems,
      clientTimeFrom,
      clientTimeTo,
      tokenAgeInDays,
    );

    // Fetch trade data for various timeframes
    const tradeData = await this.fetchTradeData(
      tokenAddress,
      clientTimeFrom,
      clientTimeTo,
      tokenAgeInDays,
      progressCallback,
    );

    // Report progress before AI analysis
    if (progressCallback) {
      progressCallback(45, 'Preparing data for AI analysis...');
    }

    const chartAnalysisServiceInput: ChartAnalysisDto = {
      tokenAddress,
      tokenName,
      tokenSymbol,
      tokenAge: `${tokenAgeInDays.toFixed(0)} days`,
      ohlcvDataJson: JSON.stringify(
        ohlcvItems.map((item) => ({
          o: item.o,
          h: item.h,
          l: item.l,
          c: item.c,
          v: item.v,
          unixTime: item.unixTime,
        })),
      ),
      numberOfCandles: ohlcvItems.length,
      candleType: ohlcvType,
      timeFrom: clientTimeFrom,
      timeTo: clientTimeTo,
      tradeDataJson: JSON.stringify(tradeData),
      priceReferencesJson: JSON.stringify(priceReferences),
      marketCap,
    };

    try {
      // Report progress for AI analysis
      if (progressCallback) {
        progressCallback(50, 'Running AI analysis...');
      }

      // Add some artificial delay stages to show progress during AI processing
      if (progressCallback) {
        setTimeout(
          () => progressCallback(60, 'Analyzing price patterns...'),
          2000,
        );
        setTimeout(
          () => progressCallback(70, 'Evaluating volume trends...'),
          5000,
        );
        setTimeout(
          () =>
            progressCallback(80, 'Identifying key support/resistance zones...'),
          8000,
        );
        setTimeout(() => progressCallback(90, 'Compiling insights...'), 12000);
      }

      const analysisOutput = await this.aiAnalysisService.getChartAnalysis(
        chartAnalysisServiceInput,
      );

      return { analysisOutput };
    } catch (error) {
      throw error;
    }
  }

  private determineOhlcvType(
    timeFromSeconds: number,
    timeToSeconds: number,
  ): {
    ohlcvType: string;
  } {
    const durationSeconds = timeToSeconds - timeFromSeconds;
    if (durationSeconds <= 0) {
      throw new BadRequestException('Time range duration must be positive.');
    }

    for (const candle of [...BIRDEYE_CANDLE_TYPES].sort(
      (a, b) => a.seconds - b.seconds,
    )) {
      const numCandles = Math.floor(durationSeconds / candle.seconds);
      if (numCandles <= MAX_BIRDEYE_CANDLES && numCandles > 0) {
        return { ohlcvType: candle.type };
      }
    }
    const fallbackType =
      BIRDEYE_CANDLE_TYPES[BIRDEYE_CANDLE_TYPES.length - 1].type;

    return { ohlcvType: fallbackType };
  }

  // Helper method to generate price references for different time periods
  private generatePriceReferences(
    ohlcvItems: BirdeyeOhlcvItem[],
    timeFrom: number,
    timeTo: number,
    tokenAgeInDays: number,
  ): {
    period: string;
    price: number;
    timestamp: number;
    changePercent: number;
  }[] {
    if (!ohlcvItems || ohlcvItems.length === 0) return [];

    // Sort items by timestamp (oldest first)
    const sortedItems = [...ohlcvItems].sort((a, b) => a.unixTime - b.unixTime);

    // Get current price (last candle's close price)
    const currentPrice = sortedItems[sortedItems.length - 1].c;
    const currentTime = sortedItems[sortedItems.length - 1].unixTime;

    // Get launch price (first candle's open price)
    const launchPrice = sortedItems[0].o;
    const launchTime = sortedItems[0].unixTime;

    const result = [
      {
        period: 'launch',
        price: launchPrice,
        timestamp: launchTime,
        changePercent: ((currentPrice - launchPrice) / launchPrice) * 100,
      },
    ];

    // Calculate the range we're looking at (in days)
    const rangeDays = (timeTo - timeFrom) / (24 * 60 * 60);

    // Prepare periods to look for
    const periodsToFind = [];

    // Always add ATH
    const ath = sortedItems.reduce(
      (max, item) => (item.h > max.h ? item : max),
      sortedItems[0],
    );
    result.push({
      period: 'ATH',
      price: ath.h,
      timestamp: ath.unixTime,
      changePercent: ((currentPrice - ath.h) / ath.h) * 100,
    });

    // Always add ATL
    const atl = sortedItems.reduce(
      (min, item) => (item.l < min.l ? item : min),
      sortedItems[0],
    );
    result.push({
      period: 'ATL',
      price: atl.l,
      timestamp: atl.unixTime,
      changePercent: ((currentPrice - atl.l) / atl.l) * 100,
    });

    // Add time-based references based on the range
    if (rangeDays >= 1) {
      periodsToFind.push({ period: '1 day ago', seconds: 24 * 60 * 60 });
    }

    if (rangeDays >= 7) {
      periodsToFind.push({ period: '1 week ago', seconds: 7 * 24 * 60 * 60 });
    }

    if (rangeDays >= 30) {
      periodsToFind.push({ period: '1 month ago', seconds: 30 * 24 * 60 * 60 });
    }

    if (rangeDays >= 90) {
      periodsToFind.push({
        period: '3 months ago',
        seconds: 90 * 24 * 60 * 60,
      });
    }

    // Don't try to look further back than the token's age
    const tokenAgeSeconds = tokenAgeInDays * 24 * 60 * 60;

    // Find prices for each period
    for (const period of periodsToFind) {
      if (period.seconds > tokenAgeSeconds) continue;

      const targetTime = currentTime - period.seconds;

      // Find the closest candle to the target time
      const closestItem = sortedItems.reduce((closest, item) => {
        return Math.abs(item.unixTime - targetTime) <
          Math.abs(closest.unixTime - targetTime)
          ? item
          : closest;
      }, sortedItems[0]);

      result.push({
        period: period.period,
        price: closestItem.c,
        timestamp: closestItem.unixTime,
        changePercent: ((currentPrice - closestItem.c) / closestItem.c) * 100,
      });
    }

    return result;
  }
}
