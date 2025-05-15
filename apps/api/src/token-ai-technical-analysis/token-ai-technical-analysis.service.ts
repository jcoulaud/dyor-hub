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

  // Method to select 5 appropriate timeframes based on date range
  private selectOptimalTimeframes(
    timeFromSeconds: number,
    timeToSeconds: number,
  ): string[] {
    // Calculate duration in seconds
    const durationInSeconds = timeToSeconds - timeFromSeconds;

    // Convert to days
    const durationInDays = durationInSeconds / (60 * 60 * 24);

    // Select timeframes based on duration
    if (durationInDays <= 1) {
      // Less than 1 day: focus on short timeframes
      return ['30m', '1h', '2h', '4h', '24h'];
    } else if (durationInDays <= 7) {
      // 1-7 days: mix of short and medium timeframes
      return ['1h', '4h', '24h', '3d', '7d'];
    } else if (durationInDays <= 30) {
      // 7-30 days: medium timeframes
      return ['4h', '24h', '3d', '7d', '14d'];
    } else if (durationInDays <= 90) {
      // 30-90 days: medium-long timeframes
      return ['24h', '3d', '7d', '14d', '30d'];
    } else if (durationInDays <= 180) {
      // 90-180 days: longer timeframes
      return ['7d', '14d', '30d', '90d', '180d'];
    } else {
      // Over 180 days: longest timeframes
      return ['14d', '30d', '90d', '180d', '1y'];
    }
  }

  async fetchTradeData(
    tokenAddress: string,
    timeFrom: number,
    timeTo: number,
    progress?: (percent: number, stage: string) => void,
  ): Promise<TradeDataByTimeframe[]> {
    const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!birdeyeApiKey) {
      this.logger.warn('Missing Birdeye API key for trade data');
      return [];
    }

    // Select optimal timeframes based on date range
    const selectedTimeframes = this.selectOptimalTimeframes(timeFrom, timeTo);
    this.logger.log(
      `Selected timeframes for analysis: ${selectedTimeframes.join(', ')}`,
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

      this.logger.log(
        `Successfully fetched ${tradeDataResults.length} trade datasets for ${tokenAddress}`,
      );
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

    // Fetch trade data for various timeframes
    const tradeData = await this.fetchTradeData(
      tokenAddress,
      clientTimeFrom,
      clientTimeTo,
      progressCallback,
    );

    // Report progress before AI analysis
    if (progressCallback) {
      progressCallback(45, 'Preparing data for AI analysis...');
    }

    const chartAnalysisServiceInput: ChartAnalysisDto = {
      tokenAddress,
      tokenName,
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
}
