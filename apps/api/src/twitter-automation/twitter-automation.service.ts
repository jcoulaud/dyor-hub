import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
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
import { TwitterService } from '../twitter/twitter.service';
import {
  BirdeyeTokenDto,
  BirdeyeTokenListResponseDto,
} from './dto/birdeye-token.dto';

@Injectable()
export class TwitterAutomationService {
  private readonly logger = new Logger(TwitterAutomationService.name);
  private readonly birdeyeApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(TweetEntity)
    private readonly tweetRepository: Repository<TweetEntity>,
    private readonly twitterService: TwitterService,
    private readonly tokenAiTechnicalAnalysisService: TokenAiTechnicalAnalysisService,
  ) {
    this.birdeyeApiKey = this.configService.get<string>('BIRDEYE_API_KEY');
    if (!this.birdeyeApiKey) {
      this.logger.error('BIRDEYE_API_KEY is not configured.');
    }
  }

  async getTrendingTokens(): Promise<BirdeyeTokenDto[]> {
    const url = 'https://public-api.birdeye.so/defi/v3/token/list';
    const params = {
      sort_by: 'volume_4h_change_percent',
      sort_type: 'desc',
      min_liquidity: 30000,
      max_liquidity: 4000000,
      min_market_cap: 100000,
      min_holder: 500,
      min_volume_4h_usd: 100000,
      offset: 0,
      limit: 100,
    };
    const headers = {
      'X-API-KEY': this.birdeyeApiKey,
      accept: 'application/json',
      'x-chain': 'solana',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<BirdeyeTokenListResponseDto>(url, {
          params,
          headers,
        }),
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.items
      ) {
        return response.data.data.items;
      } else {
        this.logger.warn(
          'No tokens found or error in Birdeye response',
          response.data,
        );
        return [];
      }
    } catch (error) {
      this.logger.error(
        'Error fetching trending tokens from Birdeye',
        error.stack,
        {
          url,
          params,
          status: error.response?.status,
        },
      );
      return [];
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6PM, { timeZone: 'UTC' })
  async handleDailyTwitterPost() {
    this.logger.log('Starting daily Twitter post job...');

    const trendingTokens = await this.getTrendingTokens();
    if (!trendingTokens || trendingTokens.length === 0) {
      this.logger.warn('No trending tokens found. Skipping Twitter post.');
      return;
    }

    let selectedTokenAnalytics: {
      token: BirdeyeTokenDto;
      name: string;
      ageInDays: number;
      humanReadableAge: string;
    } | null = null;

    for (const token of trendingTokens) {
      const alreadyPosted = await this.tweetRepository.findOne({
        where: {
          metadata: Raw(
            (alias) => `${alias} ->> 'tokenAddress' = :tokenAddress`,
            { tokenAddress: token.address },
          ),
        },
      });
      if (!alreadyPosted) {
        let ageInDays: number | null = null;
        let humanReadableAge: string = '-';

        if (token.recent_listing_time) {
          const listingTimeMs = token.recent_listing_time * 1000;
          ageInDays = (Date.now() - listingTimeMs) / (1000 * 60 * 60 * 24);
          humanReadableAge = formatDistanceToNowStrict(
            new Date(listingTimeMs),
            { addSuffix: true },
          );
        } else {
          this.logger.warn(
            `recent_listing_time not available for ${token.symbol} (${token.address}). Falling back to getTokenAgeInDays.`,
          );
          try {
            ageInDays =
              await this.tokenAiTechnicalAnalysisService.getTokenAgeInDays(
                token.address,
              );
            const approxCreationDate = new Date(
              Date.now() - ageInDays * 24 * 60 * 60 * 1000,
            );
            humanReadableAge = formatDistanceToNowStrict(approxCreationDate, {
              addSuffix: true,
            });
            this.logger.log(
              `Using fallback age for ${token.symbol} (${token.address}): ${humanReadableAge}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to get age using fallback for token ${token.address}. Skipping. Error: ${error.message}`,
            );
            continue;
          }
        }

        if (ageInDays !== null && ageInDays >= 0) {
          selectedTokenAnalytics = {
            token: token,
            name: token.name,
            ageInDays: ageInDays,
            humanReadableAge: humanReadableAge,
          };
          break;
        } else {
          this.logger.warn(
            `Invalid age calculated for token ${token.address} (${token.symbol}). Skipping.`,
          );
          continue;
        }
      }
    }

    if (!selectedTokenAnalytics) {
      this.logger.warn(
        'No new, valid trending tokens found to post after checking age/name and prior posts.',
      );
      return;
    }

    const {
      token: selectedToken,
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
          undefined, // No progress callback
        );

      if (!analysisResultObj || !analysisResultObj.analysisOutput) {
        this.logger.error(
          `AI Analysis did not return expected output for ${tokenName}.`,
        );
        return;
      }
      const analysisOutput: ChartWhispererOutput =
        analysisResultObj.analysisOutput;

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
      } else {
        this.logger.error(
          `Failed to post tweet for token ${selectedToken.address}. It will not be recorded as posted.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error during AI analysis orchestration or Twitter posting for ${tokenName}: ${error.message}`,
        {
          stack: error.stack,
          tokenAddress: selectedToken.address,
        },
      );
    }
  }

  private formatTwitterPost(
    token: BirdeyeTokenDto,
    analysis: ChartWhispererOutput,
    tokenAge: string,
  ): string {
    const dyorHubTokenLink = `https://dyorhub.xyz/tokens/${token.address}`;

    let post = `📢 Daily AI Trading Analysis from DYOR Hub 📢\n\n`;
    post += `Token (trending): ${token.name} ($${token.symbol})\n`;
    post += `CA: ${token.address}\n`;
    post += `Age: ${tokenAge}\n`;
    post += `View on DYOR Hub: ${dyorHubTokenLink}\n\n`;

    post += `--- Summary ---\n\n`;
    post += `🔑 Key Takeaway: ${analysis.bottomLine}\n`;
    post += `📊 Market Sentiment: ${analysis.marketSentiment}\n`;
    post += `🗣️ Unfiltered Truth: ${analysis.unfilteredTruth}\n\n`;

    post += `--- Detailed Analysis ---\n\n`;
    if (analysis.decodedStory) {
      if (analysis.decodedStory.priceJourney) {
        post += `📈 Price Journey: ${analysis.decodedStory.priceJourney}\n\n`;
      }
      if (analysis.decodedStory.momentum) {
        post += `💨 Momentum: ${analysis.decodedStory.momentum}\n\n`;
      }
      if (analysis.decodedStory.keyLevels) {
        post += `📉 Key Levels (Support/Resistance): ${analysis.decodedStory.keyLevels}\n\n`;
      }
      if (analysis.decodedStory.tradingActivity) {
        post += `📊 Trading Activity: ${analysis.decodedStory.tradingActivity}\n\n`;
      }
      if (analysis.decodedStory.buyerSellerDynamics) {
        post += `⚖️ Buyer/Seller Dynamics: ${analysis.decodedStory.buyerSellerDynamics}\n\n`;
      }
      if (analysis.decodedStory.timeframeAnalysis) {
        post += `⏳ Timeframe Analysis: ${analysis.decodedStory.timeframeAnalysis}\n\n`;
      }
    }

    if (analysis.ratings) {
      post += `--- Ratings (1-10) ---\n\n`;
      if (analysis.ratings.priceStrength) {
        post += `💪 Price Strength: ${analysis.ratings.priceStrength.score}/10 (${analysis.ratings.priceStrength.explanation})\n`;
      }
      if (analysis.ratings.momentum) {
        post += `💨 Momentum: ${analysis.ratings.momentum.score}/10 (${analysis.ratings.momentum.explanation})\n`;
      }
      if (analysis.ratings.buyPressure) {
        post += `📈 Buy Pressure: ${analysis.ratings.buyPressure.score}/10 (${analysis.ratings.buyPressure.explanation})\n`;
      }
      if (analysis.ratings.volumeQuality) {
        post += `💧 Volume Quality: ${analysis.ratings.volumeQuality.score}/10 (${analysis.ratings.volumeQuality.explanation})\n`;
      }
      if (analysis.ratings.overallSentiment) {
        post += `💬 Overall Sentiment: ${analysis.ratings.overallSentiment.score}/10 (${analysis.ratings.overallSentiment.explanation})\n`;
      }
      post += `\n`;
    }

    if (analysis.tradingOpinion) {
      post += `--- Trading Opinion ---\n\n`;
      post += `${analysis.tradingOpinion}\n\n`;
    }

    post += `#${token.symbol} #Solana #TradingAnalysis #DYORHub #DYOR`;

    return post;
  }
}
