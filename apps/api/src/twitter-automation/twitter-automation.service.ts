import {
  SolanaTrackerToken,
  SolanaTrackerTokensResponse,
} from '@dyor-hub/types';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { formatDistanceToNowStrict } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { Raw, Repository } from 'typeorm';
import { TweetEntity } from '../entities';
import { ChartWhispererOutput } from '../token-ai-technical-analysis/ai-analysis.service';
import { AiAnalysisRequestDto } from '../token-ai-technical-analysis/dto/ai-analysis-request.dto';
import {
  OrchestrationResult,
  TokenAiTechnicalAnalysisService,
} from '../token-ai-technical-analysis/token-ai-technical-analysis.service';
import { TokensService } from '../tokens/tokens.service';
import { TwitterService } from '../twitter/twitter.service';

const enableTwitterPostCron = process.env.NODE_ENV === 'production';

interface TrendingTokenInfo {
  address: string;
  symbol: string;
  name: string;
}

@Injectable()
export class TwitterAutomationService {
  private readonly logger = new Logger(TwitterAutomationService.name);
  private readonly birdeyeApiKey: string;
  private readonly solanaTrackerApiKey: string;
  private readonly cacheTimestamps: Map<string, number> = new Map();
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly trendingTokensCache: Map<
    string,
    SolanaTrackerTokensResponse
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(TweetEntity)
    private readonly tweetRepository: Repository<TweetEntity>,
    private readonly twitterService: TwitterService,
    private readonly tokenAiTechnicalAnalysisService: TokenAiTechnicalAnalysisService,
    private readonly tokensService: TokensService,
  ) {
    this.birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    this.solanaTrackerApiKey = this.configService.get<string>(
      'SOLANA_TRACKER_API_KEY',
    );
    if (!this.solanaTrackerApiKey) {
      this.logger.error('SOLANA_TRACKER_API_KEY is not configured.');
    }
    if (!this.birdeyeApiKey) {
      this.logger.warn(
        'BIRDEYE_API_KEY is not configured. This might affect other functionalities.',
      );
    }
  }

  async getTrendingTokens(
    timeframe: string = '4h',
  ): Promise<TrendingTokenInfo[]> {
    const validTimeframes = [
      '5m',
      '15m',
      '30m',
      '1h',
      '2h',
      '3h',
      '4h',
      '5h',
      '6h',
      '12h',
      '24h',
    ];
    if (!validTimeframes.includes(timeframe)) {
      this.logger.warn(
        `Invalid timeframe: ${timeframe}. Defaulting to 1h. Valid timeframes are: ${validTimeframes.join(', ')}`,
      );
      timeframe = '4h';
    }

    const cacheKey = `solana_tracker_trending_tokens_${timeframe}`;
    const TRENDING_TOKENS_CACHE_TTL = 5 * 60 * 1000;

    const cachedData = this.trendingTokensCache.get(cacheKey);
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);

    if (
      cachedData &&
      cachedTimestamp &&
      Date.now() - cachedTimestamp < TRENDING_TOKENS_CACHE_TTL
    ) {
      if (!cachedData) return [];
      return cachedData.map(
        (item: SolanaTrackerToken): TrendingTokenInfo => ({
          address: item.token.mint,
          symbol: item.token.symbol,
          name: item.token.name,
        }),
      );
    }

    if (this.pendingRequests.has(cacheKey)) {
      const pendingData = await this.pendingRequests.get(cacheKey);
      if (!pendingData) return [];
      return pendingData.map(
        (item: SolanaTrackerToken): TrendingTokenInfo => ({
          address: item.token.mint,
          symbol: item.token.symbol,
          name: item.token.name,
        }),
      );
    }

    const requestPromise =
      (async (): Promise<SolanaTrackerTokensResponse | null> => {
        if (!this.solanaTrackerApiKey) {
          this.logger.error(
            'SOLANA_TRACKER_API_KEY not configured. Cannot fetch trending tokens.',
          );
          throw new ServiceUnavailableException(
            'Solana Tracker API key is not configured.',
          );
        }

        const apiUrl = `https://data.solanatracker.io/tokens/trending/${timeframe}`;

        try {
          const response = await firstValueFrom(
            this.httpService.get<SolanaTrackerTokensResponse>(apiUrl, {
              headers: {
                'x-api-key': this.solanaTrackerApiKey,
              },
            }),
          );

          const trendingTokensData = response.data;

          if (!trendingTokensData || !Array.isArray(trendingTokensData)) {
            return null;
          }

          const filteredTokens = trendingTokensData.filter((token) => {
            if (
              token.risk &&
              token.risk.risks &&
              Array.isArray(token.risk.risks)
            ) {
              const hasDangerRisk = token.risk.risks.some(
                (risk) => risk.level === 'danger',
              );

              return !hasDangerRisk;
            }
            return true;
          });

          this.trendingTokensCache.set(cacheKey, filteredTokens);
          this.cacheTimestamps.set(cacheKey, Date.now());
          return filteredTokens;
        } catch (error) {
          if (error instanceof AxiosError) {
            if (
              error.response?.status === 401 ||
              error.response?.status === 403
            ) {
              this.logger.error(
                'Authorization error with Solana Tracker API. Check API Key.',
              );
            }
          } else {
            this.logger.error(
              `Unexpected error fetching Solana Tracker trending tokens for timeframe ${timeframe}: ${(error as Error).message}`,
              (error as Error).stack,
            );
          }
          return null;
        } finally {
          this.pendingRequests.delete(cacheKey);
        }
      })();

    this.pendingRequests.set(cacheKey, requestPromise);
    const result = await requestPromise;

    if (result) {
      return result.map(
        (item: SolanaTrackerToken): TrendingTokenInfo => ({
          address: item.token.mint,
          symbol: item.token.symbol,
          name: item.token.name,
        }),
      );
    }
    return [];
  }

  @Cron(CronExpression.EVERY_DAY_AT_6PM, {
    timeZone: 'UTC',
    disabled: !enableTwitterPostCron,
  })
  async handleDailyTwitterPost(
    postToTwitter: boolean = true,
  ): Promise<OrchestrationResult | void | null> {
    if (postToTwitter && !enableTwitterPostCron) {
      this.logger.warn(
        'Daily Twitter post job is disabled for this environment (NODE_ENV: %s). Execution should have been skipped by decorator.',
        process.env.NODE_ENV,
      );
      return;
    }
    this.logger.log(
      `Starting daily Twitter post job. Will post to Twitter: ${postToTwitter}`,
    );

    const trendingTokens = await this.getTrendingTokens();
    if (!trendingTokens || trendingTokens.length === 0) {
      this.logger.warn(
        'No trending tokens found. Skipping Twitter post logic.',
      );
      return null;
    }

    let selectedTokenAnalytics: {
      tokenInfo: TrendingTokenInfo;
      name: string;
      ageInDays: number;
      humanReadableAge: string;
    } | null = null;

    for (const token of trendingTokens) {
      if (postToTwitter) {
        const alreadyPosted = await this.tweetRepository.findOne({
          where: {
            metadata: Raw(
              (alias) => `${alias} ->> 'tokenAddress' = :tokenAddress`,
              { tokenAddress: token.address },
            ),
          },
        });
        if (alreadyPosted) {
          this.logger.log(`Token ${token.address} already posted. Skipping.`);
          continue;
        }
      }
      let ageInDays: number | null = null;
      let humanReadableAge: string = '-';

      try {
        const securityInfo = await this.tokensService.fetchTokenSecurityInfo(
          token.address,
        );

        if (securityInfo && securityInfo.creationTime) {
          const creationTimeMs = securityInfo.creationTime * 1000;
          ageInDays = (Date.now() - creationTimeMs) / (1000 * 60 * 60 * 24);
          humanReadableAge = formatDistanceToNowStrict(
            new Date(creationTimeMs),
            { addSuffix: true },
          );
        } else {
          this.logger.warn(
            `creationTime not available via fetchTokenSecurityInfo for ${token.symbol} (${token.address}). Skipping this token.`,
          );
          continue;
        }
      } catch (error) {
        this.logger.error(
          `Error fetching security info for ${token.symbol} (${token.address}): ${error.message}`,
        );
        continue;
      }

      if (!token.name) {
        this.logger.warn(`Token ${token.address} has no name. Skipping.`);
        continue;
      }

      if (ageInDays !== null && ageInDays >= 0) {
        selectedTokenAnalytics = {
          tokenInfo: token,
          name: token.name,
          ageInDays: ageInDays,
          humanReadableAge: humanReadableAge,
        };
        this.logger.log(
          `Selected token for processing: ${token.name} (${token.address}), Age: ${ageInDays.toFixed(2)} days.`,
        );
        break;
      } else {
        this.logger.warn(
          `Invalid age calculated for token ${token.address} (${token.symbol}). Skipping.`,
        );
      }
    }

    if (!selectedTokenAnalytics) {
      this.logger.warn(
        'No new, valid trending tokens found to process after checking age/name and prior posts (if applicable).',
      );
      return null;
    }

    const {
      tokenInfo: selectedToken,
      name: tokenName,
      ageInDays,
      humanReadableAge,
    } = selectedTokenAnalytics;

    const now = Math.floor(Date.now() / 1000);
    const timeTo = now;
    const timeFrom24h = now - 24 * 60 * 60;

    const analysisRequestDto: AiAnalysisRequestDto = {
      tokenAddress: selectedToken.address,
      timeFrom: timeFrom24h,
      timeTo: timeTo,
      sessionId: `twitter-automation-${Date.now()}`,
    };

    try {
      const analysisResultObj: OrchestrationResult =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          analysisRequestDto,
          tokenName,
          ageInDays,
          undefined,
        );

      if (!analysisResultObj || !analysisResultObj.analysisOutput) {
        this.logger.error(
          `AI Analysis did not return expected output for ${tokenName}.`,
        );
        return null;
      }
      const analysisOutput: ChartWhispererOutput =
        analysisResultObj.analysisOutput;

      this.logger.log(`AI Analysis for ${tokenName} successful.`);
      if (!postToTwitter) {
        this.logger.debug(
          `Analysis Preview for ${tokenName}:`,
          JSON.stringify(analysisResultObj, null, 2),
        );
      }

      if (postToTwitter) {
        const twitterPostText = this.formatTwitterPost(
          selectedToken,
          analysisOutput,
          humanReadableAge,
        );
        const tweetId = await this.twitterService.postTweet(twitterPostText);
        if (tweetId) {
          await this.tweetRepository.save(
            this.tweetRepository.create({
              tweetId: tweetId,
              metadata: {
                type: 'token_analysis',
                tokenAddress: selectedToken.address,
                tokenName: selectedToken.name,
                tokenSymbol: selectedToken.symbol,
                tokenAgeDays: ageInDays.toFixed(2),
                tokenAgeHuman: humanReadableAge,
              },
            }),
          );
          this.logger.log(
            `Successfully posted tweet ${tweetId} for ${tokenName}.`,
          );
        } else {
          this.logger.error(
            `Failed to post tweet for token ${selectedToken.address}. It will not be recorded as posted.`,
          );
        }
        return;
      } else {
        return analysisResultObj;
      }
    } catch (error) {
      this.logger.error(
        `Error during AI analysis orchestration or Twitter posting for ${tokenName}: ${error.message}`,
        {
          stack: error.stack,
          tokenAddress: selectedToken.address,
        },
      );
      return null;
    }
  }

  private formatTwitterPost(
    token: TrendingTokenInfo,
    analysis: ChartWhispererOutput,
    tokenAge: string,
  ): string {
    const dyorHubTokenLink = `https://dyorhub.xyz/tokens/${token.address}`;

    let post = `📢 Daily automatic AI Trading Analysis from DYOR Hub 📢\n\n`;
    post += `Token (trending): ${token.name} ($${token.symbol})\n`;
    post += `CA: ${token.address}\n`;
    post += `Age: ${tokenAge}\n`;
    post += `View on DYOR Hub: ${dyorHubTokenLink}\n\n`;

    // --- RATINGS SECTION ---
    if (analysis.ratings) {
      post += `--- RATINGS ---\n\n`;
      if (analysis.ratings.marketcapStrength) {
        post += `💪 Marketcap Strength: ${analysis.ratings.marketcapStrength.score}/10 (${analysis.ratings.marketcapStrength.explanation})\n\n`;
      }
      if (analysis.ratings.momentum) {
        post += `⚡ Momentum: ${analysis.ratings.momentum.score}/10 (${analysis.ratings.momentum.explanation})\n\n`;
      }
      if (analysis.ratings.buyPressure) {
        post += `📈 Buy Pressure: ${analysis.ratings.buyPressure.score}/10 (${analysis.ratings.buyPressure.explanation})\n\n`;
      }
      if (analysis.ratings.volumeQuality) {
        post += `💧 Volume Quality: ${analysis.ratings.volumeQuality.score}/10 (${analysis.ratings.volumeQuality.explanation})\n\n`;
      }
      if (analysis.ratings.overallSentiment) {
        post += `💬 Overall Sentiment: ${analysis.ratings.overallSentiment.score}/10 (${analysis.ratings.overallSentiment.explanation})\n`;
      }
      post += `\n`;
    }

    // --- TRADING OPINION SECTION ---
    if (analysis.tradingOpinion) {
      post += `--- TRADING OPINION ---\n\n`;
      post += `${analysis.tradingOpinion}\n\n`;
    }

    post += `#${token.symbol} #DYORHub #DYOR`;

    return post;
  }
}
