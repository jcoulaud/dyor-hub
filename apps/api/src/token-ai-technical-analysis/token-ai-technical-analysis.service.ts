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
    const {
      tokenAddress,
      timeFrom: clientTimeFrom,
      timeTo: clientTimeTo,
    } = requestDto;

    if (clientTimeFrom >= clientTimeTo) {
      throw new BadRequestException('timeFrom must be earlier than timeTo.');
    }

    const { ohlcvType } = this.determineOhlcvType(clientTimeFrom, clientTimeTo);

    let ohlcvItems: BirdeyeOhlcvItem[];

    try {
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
        ohlcvItems = [];
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

    try {
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
