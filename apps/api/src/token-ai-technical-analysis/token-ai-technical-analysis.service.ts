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
import { AiAnalysisRequestDto, Timeframe } from './dto/ai-analysis-request.dto';
import { ChartAnalysisDto } from './dto/chart-analysis.dto';

const BIRDEYE_OHLCV_ENDPOINT = 'https://public-api.birdeye.so/defi/ohlcv';
const MAX_BIRDEYE_CANDLES = 950;

interface BirdeyeOhlcvParams {
  address: string;
  type: string;
  time_from: number;
  time_to: number;
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
  { type: '1M', seconds: 30 * 24 * 60 * 60 },
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

  async prepareAndExecuteAnalysis(
    requestDto: AiAnalysisRequestDto,
    tokenName: string,
    tokenAgeInDays: number,
  ): Promise<OrchestrationResult> {
    const { tokenAddress, timeframe } = requestDto;
    this.logger.log(
      `Orchestrating AI analysis for token ${tokenAddress}, timeframe ${timeframe}`,
    );

    const { ohlcvType, timeFrom, timeTo } = this.getTimeframeParams(timeframe);
    let ohlcvItems: BirdeyeOhlcvItem[];

    try {
      const birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
      if (!birdeyeApiKey) {
        this.logger.error('BIRDEYE_API_KEY not configured.');
        throw new InternalServerErrorException('Service configuration error.');
      }
      const params: BirdeyeOhlcvParams = {
        address: tokenAddress,
        type: ohlcvType,
        time_from: timeFrom,
        time_to: timeTo,
      };
      this.logger.debug(
        `Fetching Birdeye OHLCV data with params: ${JSON.stringify(params)}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<BirdeyeOhlcvResponse>(BIRDEYE_OHLCV_ENDPOINT, {
          headers: { 'X-API-KEY': birdeyeApiKey },
          params,
        }),
      );

      if (!response.data?.success || !response.data?.data?.items) {
        this.logger.warn(
          `Birdeye API call failed or returned no items for ${tokenAddress}.`,
        );
        throw new NotFoundException('Could not retrieve OHLCV market data.');
      }
      ohlcvItems = response.data.data.items;
      if (ohlcvItems.length === 0) {
        this.logger.warn(
          `Birdeye returned 0 OHLCV items for ${tokenAddress} with params: ${JSON.stringify(params)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch OHLCV data for ${tokenAddress}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Failed to retrieve market data for analysis.',
      );
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
    };

    const analysisOutput = await this.aiAnalysisService.getChartAnalysis(
      chartAnalysisServiceInput,
    );
    return { analysisOutput };
  }

  private getTimeframeParams(timeframe: Timeframe): {
    ohlcvType: string;
    timeFrom: number;
    timeTo: number;
  } {
    const nowSeconds = Math.floor(Date.now() / 1000);
    let durationSeconds = 0;
    switch (timeframe) {
      case '1D':
        durationSeconds = 1 * 24 * 60 * 60;
        break;
      case '1W':
        durationSeconds = 7 * 24 * 60 * 60;
        break;
      case '1M':
        durationSeconds = 30 * 24 * 60 * 60;
        break;
      case '3M':
        durationSeconds = 90 * 24 * 60 * 60;
        break;
      case '6M':
        durationSeconds = 180 * 24 * 60 * 60;
        break;
      case '1Y':
        durationSeconds = 365 * 24 * 60 * 60;
        break;
      default:
        durationSeconds = 1 * 24 * 60 * 60;
    }
    const timeFrom = nowSeconds - durationSeconds;
    let selectedOhlcvType =
      BIRDEYE_CANDLE_TYPES[BIRDEYE_CANDLE_TYPES.length - 1].type;
    for (const candle of BIRDEYE_CANDLE_TYPES) {
      const numCandles = Math.floor(durationSeconds / candle.seconds);
      if (numCandles <= MAX_BIRDEYE_CANDLES && numCandles > 0) {
        selectedOhlcvType = candle.type;
      }
    }
    this.logger.debug(
      `Selected timeframe: ${timeframe}, durationSeconds: ${durationSeconds}, calculated ohlcvType: ${selectedOhlcvType}`,
    );
    return { ohlcvType: selectedOhlcvType, timeFrom, timeTo: nowSeconds };
  }
}
