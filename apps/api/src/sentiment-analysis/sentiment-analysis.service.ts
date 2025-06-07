import {
  AccountSentimentProfile,
  AuthenticitySignals,
  EnhancedEngagementMetrics,
  EnhancedTwitterAnalysis,
  InteractionSentiment,
  RiskIndicators,
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
  SentimentInsights,
  SentimentRecommendations,
  TweetSentiment,
  TwitterAPITweet,
  TwitterAPIUser,
  TwitterUserInfo,
} from '@dyor-hub/types';
import { ChatOpenAI } from '@langchain/openai';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';

// Zod schemas for structured output
const SentimentScoreSchema = z.object({
  overall: z.number().min(-1).max(1).describe('Sentiment score from -1 to 1'),
  confidence: z.number().min(0).max(1).describe('Confidence level from 0 to 1'),
  primaryEmotion: z
    .enum(['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'neutral'])
    .describe('Primary emotion detected'),
  sentimentIndicators: z
    .array(z.string())
    .describe('Key words/phrases that influenced sentiment'),
  contextNotes: z.string().describe('Context notes like sarcasm, irony, etc.'),
});

const TweetAnalysisSchema = z.object({
  tweetId: z.string(),
  sentiment: SentimentScoreSchema,
});

const BatchTweetAnalysisSchema = z.object({
  tweets: z.array(TweetAnalysisSchema).describe('Array of analyzed tweets'),
});

const AccountProfileAnalysisSchema = z.object({
  overallSentiment: SentimentScoreSchema,
  sentimentConsistency: z
    .number()
    .min(0)
    .max(1)
    .describe('How stable sentiment is'),
  sentimentTrend: z
    .enum(['improving', 'declining', 'stable'])
    .describe('Sentiment trend'),
  topicSentiments: z
    .record(z.string(), SentimentScoreSchema)
    .nullable()
    .describe('Topic-based sentiment breakdown'),
  communicationStyle: z.object({
    tone: z
      .enum(['formal', 'casual', 'humorous', 'professional', 'mixed'])
      .describe('Communication tone'),
    authenticity: z
      .enum(['high', 'medium', 'low'])
      .describe('Authenticity level'),
    responsiveness: z
      .enum(['responsive', 'moderate', 'inactive'])
      .describe('Responsiveness level'),
  }),
  engagementQuality: z.object({
    meaningfulRepliesRatio: z
      .number()
      .min(0)
      .max(1)
      .describe('Ratio of meaningful replies'),
    controversyIndex: z.number().min(0).max(1).describe('Level of controversy'),
    authenticityScore: z.number().min(0).max(1).describe('Authenticity score'),
  }),
});

const InsightsSchema = z.object({
  summary: z.string().describe('Summary of sentiment position'),
  keyFindings: z
    .array(z.string())
    .describe(
      'Key findings - MUST include 8-12 specific, data-driven bullet points using exact metrics (e.g., "4.5 tweets/day", "3.2% engagement", "828:1 follower ratio"). Cover activity patterns, authenticity signals, risk indicators, and investment insights.',
    ),
  sentimentDrivers: z.object({
    positive: z
      .array(z.string())
      .describe(
        'LEGITIMACY SIGNALS - positive indicators like human communication, stable history, healthy networks, good engagement',
      ),
    negative: z
      .array(z.string())
      .describe(
        'CONCERNING PATTERNS - negative indicators like bot activity, poor engagement, suspicious behavior',
      ),
  }),
  riskFactors: z
    .array(z.string())
    .describe(
      'RED FLAGS ONLY - actual scam/rug pull indicators explaining why the score is not 100/100. Include username changes, spam keywords, excessive promotions, suspicious domains, bot patterns, etc. If score < 100, there MUST be red flags explaining the deduction.',
    ),
  communityPerception: z.object({
    summary: z.string().describe('Community perception summary'),
    supportLevel: z.enum(['high', 'medium', 'low']).describe('Support level'),
    criticismLevel: z
      .enum(['high', 'medium', 'low'])
      .describe('Criticism level'),
    engagementQuality: z
      .enum(['high', 'medium', 'low'])
      .describe('Engagement quality'),
  }),
});

const RecommendationsSchema = z.object({
  immediate: z.array(z.string()).describe('Immediate actions'),
  strategic: z.array(z.string()).describe('Strategic recommendations'),
  engagementStrategy: z.object({
    recommended: z.array(z.string()).describe('Recommended engagement tactics'),
    avoid: z.array(z.string()).describe('Engagement approaches to avoid'),
  }),
  riskMitigation: z.array(z.string()).describe('Risk mitigation strategies'),
});

@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);
  private readonly llm: ChatOpenAI;
  private readonly twitterApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(TwitterUsernameHistoryEntity)
    private readonly twitterUsernameHistoryRepository: Repository<TwitterUsernameHistoryEntity>,
  ) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.twitterApiKey = this.configService.get<string>(
      'TWITTERAPI_IO_API_KEY',
    );

    if (!openaiApiKey) {
      this.logger.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is required for sentiment analysis');
    }

    if (!this.twitterApiKey) {
      this.logger.error('TWITTERAPI_IO_API_KEY is not configured');
      throw new Error('TWITTERAPI_IO_API_KEY is required for Twitter data');
    }

    this.llm = new ChatOpenAI({
      apiKey: openaiApiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      timeout: 30000,
    });

    this.logger.log('SentimentAnalysisService initialized successfully');
  }

  private async getAccountInfo(
    username: string,
  ): Promise<TwitterUserInfo | null> {
    try {
      const url = `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(username)}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-API-Key': this.twitterApiKey,
          },
        }),
      );

      if (response.data?.status === 'success' && response.data?.data) {
        return response.data.data as TwitterUserInfo;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to get account info for @${username}:`,
        error.message,
      );
      return null;
    }
  }

  private async getTwitterUsernameHistory(
    username: string,
  ): Promise<TwitterUsernameHistoryEntity[]> {
    try {
      return await this.twitterUsernameHistoryRepository.find({
        where: { twitterUsername: username },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to get username history for @${username}:`,
        error.message,
      );
      return [];
    }
  }

  async analyzeSentiment(
    request: SentimentAnalysisRequest,
  ): Promise<SentimentAnalysisResponse> {
    return this.analyzeSentimentWithProgress(request);
  }

  async analyzeSentimentWithProgress(
    request: SentimentAnalysisRequest,
    progressCallback?: (percent: number, stage: string) => void,
  ): Promise<SentimentAnalysisResponse> {
    try {
      // 1. Collect Twitter data
      progressCallback?.(20, 'Collecting Twitter data...');
      const twitterData = await this.collectTwitterData(request);

      // 2. Analyze tweets with OpenAI
      progressCallback?.(40, 'Analyzing tweet sentiments...');
      const tweetSentiments = await this.analyzeTweetSentiments(
        twitterData.tweets,
        progressCallback,
      );

      // Update progress after sentiment analysis
      progressCallback?.(65, 'Tweet sentiment analysis completed...');

      // 3. Analyze interactions if requested
      progressCallback?.(70, 'Analyzing interactions...');
      const interactions = request.options?.includeReplies
        ? await this.analyzeInteractions(request.username, twitterData.tweets)
        : [];

      // 4. Create account sentiment profile
      progressCallback?.(80, 'Creating sentiment profile...');
      const profile = await this.createAccountProfile(
        request.username,
        tweetSentiments,
        twitterData.userInfo,
        request,
      );

      // 5. Generate insights and recommendations
      progressCallback?.(90, 'Generating insights and recommendations...');
      const insights = await this.generateInsights(
        profile,
        tweetSentiments,
        interactions,
      );
      const recommendations = await this.generateRecommendations(
        profile,
        insights,
      );

      const response: SentimentAnalysisResponse = {
        username: request.username,
        profile,
        recentTweets: tweetSentiments.slice(0, 60), // Most recent 60
        interactions,
        insights,
        recommendations,
      };

      progressCallback?.(100, 'Analysis complete!');

      this.logger.log(
        `Sentiment analysis completed for @${request.username}. Overall sentiment: ${profile.overallSentiment.overall.toFixed(2)}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to analyze sentiment for @${request.username}`,
        error,
      );
      throw error;
    }
  }

  private async collectTwitterData(request: SentimentAnalysisRequest) {
    const maxTweets = request.options?.maxTweets || 20;
    const tweets: TwitterAPITweet[] = [];
    let userInfo: TwitterAPIUser | null = null;
    let cursor = '';
    let collectedCount = 0;

    try {
      // Remove @ symbol if present
      const cleanUsername = request.username.startsWith('@')
        ? request.username.slice(1)
        : request.username;

      // Primary query gets most tweets, supplemental queries get remainder
      const primaryQuery = `from:${cleanUsername} -is:retweet -is:quote`; // Original content only
      const supplementalQueries = [
        `from:${cleanUsername} is:reply`, // Replies to gauge engagement
        `from:${cleanUsername} min_faves:5`, // Popular content
      ];

      // Collect 80% from primary query, 20% from supplemental
      const primaryMaxTweets = Math.floor(maxTweets * 0.8); // 48 tweets from primary
      const supplementalMaxTweets = Math.floor(
        (maxTweets - primaryMaxTweets) / supplementalQueries.length,
      ); // 6 each from supplemental

      // First, collect from primary query
      let queryCollectedCount = 0;
      cursor = '';

      while (
        queryCollectedCount < primaryMaxTweets &&
        collectedCount < maxTweets
      ) {
        const params = new URLSearchParams({
          queryType: 'Latest',
          query: primaryQuery,
        });

        if (cursor) {
          params.append('cursor', cursor);
        }

        const tweetsResponse = await firstValueFrom(
          this.httpService.get(
            `https://api.twitterapi.io/twitter/tweet/advanced_search?${params.toString()}`,
            {
              headers: {
                'X-API-Key': this.twitterApiKey,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            },
          ),
        );

        if (
          !tweetsResponse.data?.tweets ||
          tweetsResponse.data.tweets.length === 0
        ) {
          break;
        }

        const apiTweets = tweetsResponse.data.tweets;

        // Convert TwitterAPI.io format to our TwitterAPITweet format
        for (const tweet of apiTweets) {
          if (collectedCount >= maxTweets) break;

          // Skip retweets for sentiment analysis (focus on original content)
          if (tweet.retweeted_tweet) continue;

          const convertedTweet: TwitterAPITweet = {
            id: tweet.id,
            text: tweet.text,
            created_at: tweet.createdAt,
            author_id: tweet.author.id,
            public_metrics: {
              like_count: tweet.likeCount || 0,
              retweet_count: tweet.retweetCount || 0,
              reply_count: tweet.replyCount || 0,
              quote_count: tweet.quoteCount || 0,
            },
          };

          tweets.push(convertedTweet);
          collectedCount++;
          queryCollectedCount++;

          // Extract user info from the first tweet
          if (!userInfo && tweet.author) {
            userInfo = {
              id: tweet.author.id,
              username: tweet.author.userName,
              name: tweet.author.name,
              profile_image_url: tweet.author.profilePicture,
            };
          }
        }

        // Check if there are more pages
        if (
          !tweetsResponse.data.has_next_page ||
          !tweetsResponse.data.next_cursor
        ) {
          break;
        }

        cursor = tweetsResponse.data.next_cursor;

        // Add a small delay between requests to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Then collect from supplemental queries
      for (const baseQuery of supplementalQueries) {
        if (collectedCount >= maxTweets) break;

        queryCollectedCount = 0;
        cursor = '';

        while (
          queryCollectedCount < supplementalMaxTweets &&
          collectedCount < maxTweets
        ) {
          const params = new URLSearchParams({
            queryType: 'Latest',
            query: baseQuery,
          });

          if (cursor) {
            params.append('cursor', cursor);
          }

          const tweetsResponse = await firstValueFrom(
            this.httpService.get(
              `https://api.twitterapi.io/twitter/tweet/advanced_search?${params.toString()}`,
              {
                headers: {
                  'X-API-Key': this.twitterApiKey,
                  'Content-Type': 'application/json',
                },
                timeout: 15000,
              },
            ),
          );

          if (
            !tweetsResponse.data?.tweets ||
            tweetsResponse.data.tweets.length === 0
          ) {
            break;
          }

          const apiTweets = tweetsResponse.data.tweets;

          // Convert TwitterAPI.io format to our TwitterAPITweet format
          for (const tweet of apiTweets) {
            if (collectedCount >= maxTweets) break;

            // Skip retweets for sentiment analysis (focus on original content)
            if (tweet.retweeted_tweet) continue;

            const convertedTweet: TwitterAPITweet = {
              id: tweet.id,
              text: tweet.text,
              created_at: tweet.createdAt,
              author_id: tweet.author.id,
              public_metrics: {
                like_count: tweet.likeCount || 0,
                retweet_count: tweet.retweetCount || 0,
                reply_count: tweet.replyCount || 0,
                quote_count: tweet.quoteCount || 0,
              },
            };

            tweets.push(convertedTweet);
            collectedCount++;
            queryCollectedCount++;

            // Extract user info from the first tweet
            if (!userInfo && tweet.author) {
              userInfo = {
                id: tweet.author.id,
                username: tweet.author.userName,
                name: tweet.author.name,
                profile_image_url: tweet.author.profilePicture,
              };
            }
          }

          // Check if there are more pages
          if (
            !tweetsResponse.data.has_next_page ||
            !tweetsResponse.data.next_cursor
          ) {
            break;
          }

          cursor = tweetsResponse.data.next_cursor;

          // Add a small delay between requests to be respectful to the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return { tweets, userInfo };
    } catch (error) {
      this.logger.error(
        `Failed to collect Twitter data for @${request.username}`,
        error,
      );
      throw error;
    }
  }

  private async analyzeTweetSentiments(
    tweets: TwitterAPITweet[],
    progressCallback?: (percent: number, stage: string) => void,
  ): Promise<TweetSentiment[]> {
    progressCallback?.(50, 'Analyzing Twitter communication patterns...');

    try {
      const results = await this.processTweetBatch(tweets);
      progressCallback?.(65, `Tweet sentiment analysis completed`);
      return results;
    } catch (error) {
      this.logger.error(`Single batch processing failed: ${error.message}`);
      // Create fallback sentiments instead of retrying with batches
      this.logger.log('Creating fallback sentiments due to OpenAI failure');
      progressCallback?.(65, `Creating fallback analysis...`);
      return this.createFallbackSentiments(tweets);
    }
  }

  private createFallbackSentiments(
    tweets: TwitterAPITweet[],
  ): TweetSentiment[] {
    return tweets.map((tweet) => ({
      tweetId: tweet.id,
      text: tweet.text,
      sentiment: {
        overall: 0,
        confidence: 0.5,
        primaryEmotion: 'neutral' as const,
        sentimentIndicators: [],
        contextNotes: 'Analysis failed - using fallback',
      },
      author: {
        username: '',
        displayName: '',
        profileImageUrl: '',
      },
      metrics: {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
        quotes: tweet.public_metrics.quote_count,
      },
      createdAt: tweet.created_at,
    }));
  }

  private async processTweetBatch(
    tweets: TwitterAPITweet[],
  ): Promise<TweetSentiment[]> {
    const prompt = `
Analyze the sentiment of these tweets and provide detailed assessments:

${tweets
  .map(
    (tweet, index) => `
${index + 1}. Tweet ID: ${tweet.id}
Text: "${tweet.text}"
Metrics: ${tweet.public_metrics.like_count} likes, ${tweet.public_metrics.retweet_count} retweets, ${tweet.public_metrics.reply_count} replies
`,
  )
  .join('\n')}

For each tweet, provide:
1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
2. Primary emotion (joy, anger, sadness, fear, surprise, disgust, neutral)
3. Confidence level (0-1)
4. Key sentiment indicators (words/phrases that influenced the score)
5. Context notes (sarcasm, irony, cultural references, etc.)

Analyze the tweets in order and provide sentiment analysis for each one.`;

    try {
      const startTime = Date.now();
      const llmWithSchema = this.llm.withStructuredOutput(
        BatchTweetAnalysisSchema,
      );

      // Add timeout wrapper for better error handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('OpenAI call timed out after 60 seconds')),
          60000,
        );
      });

      const analysisPromise = llmWithSchema.invoke(prompt);
      const analysis = (await Promise.race([
        analysisPromise,
        timeoutPromise,
      ])) as { tweets: Array<any> };

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully analyzed ${tweets.length} tweets in ${duration}ms`,
      );
      this.logger.debug(
        `Received ${analysis.tweets?.length || 0} tweet analyses from OpenAI`,
      );

      return tweets.map((tweet, index) => {
        const sentimentData = analysis.tweets[index] || {
          tweetId: tweet.id,
          sentiment: {
            overall: 0,
            confidence: 0.5,
            primaryEmotion: 'neutral' as const,
            sentimentIndicators: [],
            contextNotes: 'Analysis unavailable',
          },
        };

        return {
          tweetId: tweet.id,
          text: tweet.text,
          sentiment: {
            overall: sentimentData.sentiment.overall ?? 0,
            confidence: sentimentData.sentiment.confidence ?? 0.5,
            primaryEmotion: sentimentData.sentiment.primaryEmotion ?? 'neutral',
            sentimentIndicators:
              sentimentData.sentiment.sentimentIndicators ?? [],
            contextNotes:
              sentimentData.sentiment.contextNotes ?? 'Analysis unavailable',
          },
          author: {
            username: '', // Will be filled from user data
            displayName: '',
            profileImageUrl: '',
          },
          metrics: {
            likes: tweet.public_metrics.like_count,
            retweets: tweet.public_metrics.retweet_count,
            replies: tweet.public_metrics.reply_count,
            quotes: tweet.public_metrics.quote_count,
          },
          createdAt: tweet.created_at,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyze tweet sentiments with OpenAI: ${error.message || error}`,
        error.stack,
      );
      this.logger.warn(
        `Using fallback neutral sentiment for ${tweets.length} tweets due to OpenAI failure`,
      );
      // Return neutral sentiment for all tweets as fallback
      return tweets.map((tweet) => ({
        tweetId: tweet.id,
        text: tweet.text,
        sentiment: {
          overall: 0,
          confidence: 0.5,
          primaryEmotion: 'neutral' as const,
          sentimentIndicators: [],
          contextNotes: 'Analysis failed',
        },
        author: {
          username: '',
          displayName: '',
          profileImageUrl: '',
        },
        metrics: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          quotes: tweet.public_metrics.quote_count,
        },
        createdAt: tweet.created_at,
      }));
    }
  }

  private async analyzeInteractions(
    username: string,
    tweets: TwitterAPITweet[],
  ): Promise<InteractionSentiment[]> {
    // TODO: Implement replies analysis
    // This would involve:
    // 1. Getting replies to each tweet using twitterapi.io
    // 2. Analyzing sentiment of replies to understand community perception
    // 3. Calculating interaction sentiment scores
    // For now, return empty array as this feature is not yet implemented
    return [];
  }

  private async createAccountProfile(
    username: string,
    tweetSentiments: TweetSentiment[],
    userInfo: TwitterAPIUser | null,
    request: SentimentAnalysisRequest,
  ): Promise<AccountSentimentProfile> {
    const prompt = `
Analyze this Twitter account's overall sentiment profile based on their recent tweets:

Username: @${username}
Number of tweets analyzed: ${tweetSentiments.length}

Tweet sentiments:
${tweetSentiments
  .map(
    (tweet) => `
- "${tweet.text}" (Sentiment: ${tweet.sentiment.overall.toFixed(2)}, Emotion: ${tweet.sentiment.primaryEmotion})
`,
  )
  .join('')}

Provide a comprehensive account analysis:
1. Overall sentiment score (-1 to 1)
2. Sentiment consistency (0-1, how stable their sentiment is)
3. Sentiment trend (improving/declining/stable)
4. Communication style assessment
5. Authenticity indicators
6. Topic-based sentiment breakdown
7. Engagement quality assessment

Analyze the account comprehensively and provide structured data.`;

    try {
      const llmWithSchema = this.llm.withStructuredOutput(
        AccountProfileAnalysisSchema,
      );
      const analysis = await llmWithSchema.invoke(prompt);

      return {
        username,
        displayName: userInfo?.name || username,
        profileImageUrl: userInfo?.profile_image_url,
        overallSentiment: {
          overall: analysis.overallSentiment.overall ?? 0,
          confidence: analysis.overallSentiment.confidence ?? 0.5,
          primaryEmotion: analysis.overallSentiment.primaryEmotion ?? 'neutral',
          contextNotes: analysis.overallSentiment.contextNotes ?? '',
        },
        sentimentConsistency: analysis.sentimentConsistency ?? 0.5,
        sentimentTrend: analysis.sentimentTrend ?? 'stable',
        topicSentiments: Object.fromEntries(
          Object.entries(analysis.topicSentiments || {}).map(([key, value]) => [
            key,
            {
              overall: value.overall ?? 0,
              confidence: value.confidence ?? 0.5,
              primaryEmotion: value.primaryEmotion ?? 'neutral',
              contextNotes: value.contextNotes ?? '',
            },
          ]),
        ),
        engagementQuality: {
          meaningfulRepliesRatio:
            analysis.engagementQuality?.meaningfulRepliesRatio ?? 0.5,
          controversyIndex: analysis.engagementQuality?.controversyIndex ?? 0.3,
          authenticityScore:
            analysis.engagementQuality?.authenticityScore ?? 0.7,
        },
        communicationStyle: {
          tone: this.mapToValidTone(analysis.communicationStyle?.tone),
          authenticity: analysis.communicationStyle?.authenticity ?? 'medium',
          responsiveness: this.mapToValidResponsiveness(
            analysis.communicationStyle?.responsiveness,
          ),
        },
        analysisMetadata: {
          tweetsAnalyzed: tweetSentiments.length,
          mentionsAnalyzed: 0,
          interactionsAnalyzed: 0,
          analysisDate: new Date().toISOString(),
          dataRange: {
            from:
              request.dateRange?.from ||
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: request.dateRange?.to || new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to create account profile with OpenAI', error);
      // Return default profile
      return {
        username,
        displayName: userInfo?.name || username,
        profileImageUrl: userInfo?.profile_image_url,
        overallSentiment: {
          overall: 0,
          confidence: 0.5,
          primaryEmotion: 'neutral',
          contextNotes: 'Analysis failed',
        },
        sentimentConsistency: 0.5,
        sentimentTrend: 'stable',
        topicSentiments: {},
        engagementQuality: {
          meaningfulRepliesRatio: 0.5,
          controversyIndex: 0.3,
          authenticityScore: 0.7,
        },
        communicationStyle: {
          tone: 'casual',
          authenticity: 'medium',
          responsiveness: 'moderate',
        },
        analysisMetadata: {
          tweetsAnalyzed: tweetSentiments.length,
          mentionsAnalyzed: 0,
          interactionsAnalyzed: 0,
          analysisDate: new Date().toISOString(),
          dataRange: {
            from:
              request.dateRange?.from ||
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: request.dateRange?.to || new Date().toISOString(),
          },
        },
      };
    }
  }

  private async generateEnhancedAnalysis(
    username: string,
    tweets: TwitterAPITweet[],
    userInfo: TwitterUserInfo | null,
  ): Promise<EnhancedTwitterAnalysis> {
    const basicMetrics = this.calculateBasicMetrics(tweets);
    const engagementQuality = this.analyzeEngagementQuality(tweets, userInfo);
    const authenticitySignals = this.analyzeAuthenticity(userInfo, tweets);
    const riskIndicators = this.analyzeRiskIndicators(tweets, userInfo);
    const networkAnalysis = this.analyzeNetworkHealth(tweets, userInfo);

    return {
      basicMetrics,
      engagementQuality,
      authenticitySignals,
      riskIndicators,
      networkAnalysis,
    };
  }

  private calculateBasicMetrics(tweets: TwitterAPITweet[]) {
    const totalTweets = tweets.length;
    const totalLikes = tweets.reduce(
      (sum, t) => sum + t.public_metrics.like_count,
      0,
    );
    const totalRetweets = tweets.reduce(
      (sum, t) => sum + t.public_metrics.retweet_count,
      0,
    );
    const totalReplies = tweets.reduce(
      (sum, t) => sum + t.public_metrics.reply_count,
      0,
    );

    return {
      totalTweets,
      totalReplies,
      totalRetweets: totalRetweets,
      averageLikes: totalLikes / totalTweets,
      averageRetweets: totalRetweets / totalTweets,
    };
  }

  private analyzeEngagementQuality(
    tweets: TwitterAPITweet[],
    userInfo: TwitterUserInfo | null,
  ): EnhancedEngagementMetrics {
    const originalTweets = tweets.filter((t) => !t.text.startsWith('RT @'));
    const originalContentRatio = originalTweets.length / tweets.length;

    const totalEngagement = tweets.reduce(
      (sum, t) =>
        sum +
        t.public_metrics.like_count +
        t.public_metrics.retweet_count +
        t.public_metrics.reply_count,
      0,
    );

    const averageEngagementRate = userInfo?.followers
      ? totalEngagement / (userInfo.followers * tweets.length)
      : 0;

    // Viral content (above average engagement)
    const avgLikes =
      tweets.reduce((sum, t) => sum + t.public_metrics.like_count, 0) /
      tweets.length;
    const viralContentCount = tweets.filter(
      (t) => t.public_metrics.like_count > avgLikes * 3,
    ).length;

    const replyToPostRatio =
      tweets.reduce((sum, t) => sum + t.public_metrics.reply_count, 0) /
      tweets.length;

    return {
      replyToPostRatio,
      originalContentRatio,
      averageEngagementRate,
      viralContentCount,
      authenticInteractionRatio: 0.8, // Placeholder - would need deeper network analysis
    };
  }

  private analyzeAuthenticity(
    userInfo: TwitterUserInfo | null,
    tweets: TwitterAPITweet[],
  ): AuthenticitySignals {
    if (!userInfo) {
      return {
        verificationStatus: { isVerified: false, isBlueVerified: false },
        accountMetrics: {
          accountAgeMonths: 0,
          followerToFollowingRatio: 0,
          tweetsPerDay: 0,
          profileCompleteness: 0,
        },
        growthPattern: 'unknown',
        geographicSignals: {
          timeZoneConsistency: false,
          languageConsistency: false,
        },
      };
    }

    const accountAge = new Date();
    const createdAt = new Date(userInfo.createdAt);

    // Debug date parsing and handle invalid dates
    this.logger.warn(
      `Account age calculation: ${accountAge.toISOString()} - ${createdAt.toISOString()}`,
    );

    // Handle invalid/future dates from API data
    if (createdAt.getTime() > accountAge.getTime()) {
      this.logger.warn(
        `Invalid future creation date detected: ${createdAt.toISOString()}. Using fallback.`,
      );
      // Use a reasonable fallback (6 months old)
      const fallbackDate = new Date(
        accountAge.getTime() - 6 * 30 * 24 * 60 * 60 * 1000,
      );
      const timeDiff = accountAge.getTime() - fallbackDate.getTime();
      const accountAgeMonths = timeDiff / (1000 * 60 * 60 * 24 * 30);

      return {
        verificationStatus: {
          isVerified: userInfo.isVerified,
          isBlueVerified: userInfo.isBlueVerified,
          verifiedType: userInfo.verifiedType,
        },
        accountMetrics: {
          accountAgeMonths,
          followerToFollowingRatio:
            userInfo.following > 0
              ? userInfo.followers / userInfo.following
              : userInfo.followers,
          tweetsPerDay:
            userInfo.statusesCount / Math.max(accountAgeMonths * 30, 1),
          profileCompleteness: this.getProfileCompleteness(userInfo),
        },
        growthPattern: 'unknown',
        geographicSignals: {
          timeZoneConsistency: true,
          languageConsistency: true,
        },
      };
    }

    // Normal calculation for valid dates
    const timeDiff = accountAge.getTime() - createdAt.getTime();
    const accountAgeMonths = timeDiff / (1000 * 60 * 60 * 24 * 30);

    const followerToFollowingRatio =
      userInfo.following > 0
        ? userInfo.followers / userInfo.following
        : userInfo.followers;
    const tweetsPerDay =
      userInfo.statusesCount / Math.max(accountAgeMonths * 30, 1);

    // Profile completeness score
    const profileCompleteness = this.getProfileCompleteness(userInfo);

    // Growth pattern analysis
    let growthPattern: 'organic' | 'questionable' | 'suspicious' | 'unknown' =
      'organic';
    if (followerToFollowingRatio > 100 && userInfo.followers > 10000)
      growthPattern = 'organic';
    else if (followerToFollowingRatio < 0.1 && userInfo.followers > 1000)
      growthPattern = 'questionable';
    else if (
      tweetsPerDay > 50 ||
      (userInfo.followers > 50000 && accountAgeMonths < 6)
    )
      growthPattern = 'suspicious';

    return {
      verificationStatus: {
        isVerified: userInfo.isVerified,
        isBlueVerified: userInfo.isBlueVerified,
        verifiedType: userInfo.verifiedType,
      },
      accountMetrics: {
        accountAgeMonths,
        followerToFollowingRatio,
        tweetsPerDay,
        profileCompleteness,
      },
      growthPattern,
      geographicSignals: {
        timeZoneConsistency: true, // Would need timezone analysis
        languageConsistency: true, // Would need language detection
      },
    };
  }

  private analyzeRiskIndicators(
    tweets: TwitterAPITweet[],
    userInfo: TwitterUserInfo | null,
  ): RiskIndicators {
    // Detect repetitive content
    const tweetTexts = tweets.map((t) => t.text.toLowerCase());
    const uniqueTexts = new Set(tweetTexts);
    const repetitiveContent = uniqueTexts.size / tweetTexts.length < 0.8;

    // Analyze posting times for bot-like patterns
    const postingTimes = tweets.map((t) => new Date(t.created_at).getHours());
    const timeDistribution = postingTimes.reduce(
      (acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
    const unusualPostingTimes = Object.values(timeDistribution).some(
      (count) => count > tweets.length * 0.5,
    );

    // Bot-like language detection (more conservative for crypto space)
    const botKeywords = [
      'follow back instantly',
      'check dm urgent',
      'link in bio fast',
      'guaranteed 100x',
      'instant profit',
      'send me private message',
    ];
    // Require at least 2 different bot indicators across multiple tweets
    const botIndicatorCount = botKeywords.filter((keyword) =>
      tweets.some((t) => t.text.toLowerCase().includes(keyword)),
    ).length;
    const botLikeLanguage = botIndicatorCount >= 2;

    // Spam keywords
    const spamKeywords = [
      'guaranteed profit',
      'risk free',
      'easy money',
      'get rich quick',
    ];
    const detectedSpamKeywords = spamKeywords.filter((keyword) =>
      tweets.some((t) => t.text.toLowerCase().includes(keyword)),
    );

    // Promotional content analysis
    const promotionalTweets = tweets.filter(
      (t) =>
        t.text.includes('http') ||
        t.text.includes('buy') ||
        t.text.includes('invest'),
    );
    const excessivePromotions = promotionalTweets.length > tweets.length * 0.6;

    // Risk level calculation (more conservative)
    let riskScore = 0;
    if (repetitiveContent) riskScore += 20;
    if (unusualPostingTimes) riskScore += 10;
    if (botLikeLanguage) riskScore += 30; // Higher weight since we made detection stricter
    if (excessivePromotions) riskScore += 20;
    if (detectedSpamKeywords.length > 0) riskScore += 20;

    const overallRiskLevel =
      riskScore >= 70
        ? 'critical'
        : riskScore >= 50
          ? 'high'
          : riskScore >= 40
            ? 'medium'
            : 'low';

    return {
      suspiciousPatterns: {
        repetitiveContent,
        unusualPostingTimes,
        botLikeLanguage,
      },
      networkRisks: {
        botInteractionRatio: 0.1, // Placeholder
        unverifiedMentionsRatio: 0.2, // Placeholder
        suspiciousDomains: [], // Would need URL analysis
      },
      contentRisks: {
        spamKeywords: detectedSpamKeywords,
        excessivePromotions,
        misleadingClaims: false, // Would need claim verification
      },
      overallRiskLevel,
    };
  }

  private analyzeNetworkHealth(
    tweets: TwitterAPITweet[],
    userInfo: TwitterUserInfo | null,
  ) {
    // Simplified network analysis
    const mentionedUsers = tweets.flatMap((t) => {
      const mentions = t.text.match(/@\w+/g) || [];
      return mentions.map((m) => m.substring(1));
    });

    const uniqueMentions = new Set(mentionedUsers);
    const influencerConnections = uniqueMentions.size; // Simplified

    return {
      communityHealth: 'healthy' as const, // Would need deeper analysis
      influencerConnections,
      verifiedInteractions: 0, // Would need verification status of mentioned users
    };
  }

  private getProfileCompleteness(userInfo: TwitterUserInfo): number {
    let profileCompleteness = 0;
    if (userInfo.description) profileCompleteness += 0.3;
    if (userInfo.url) profileCompleteness += 0.2;
    if (userInfo.location) profileCompleteness += 0.2;
    if (userInfo.profilePicture) profileCompleteness += 0.15;
    if (userInfo.coverPicture) profileCompleteness += 0.15;
    return profileCompleteness;
  }

  private mapToValidTone(
    tone?: string,
  ): 'professional' | 'casual' | 'unprofessional' | 'suspicious' {
    switch (tone) {
      case 'formal':
      case 'professional':
        return 'professional';
      case 'casual':
      case 'humorous':
        return 'casual';
      case 'mixed':
        return 'casual';
      case 'suspicious':
        return 'suspicious';
      case 'unprofessional':
        return 'unprofessional';
      default:
        return 'casual';
    }
  }

  private mapToValidResponsiveness(
    responsiveness?: string,
  ): 'engaging' | 'moderate' | 'inactive' {
    switch (responsiveness) {
      case 'responsive':
      case 'engaging':
        return 'engaging';
      case 'moderate':
        return 'moderate';
      case 'inactive':
        return 'inactive';
      default:
        return 'moderate';
    }
  }

  private async generateInsights(
    profile: AccountSentimentProfile,
    tweets: TweetSentiment[],
    interactions: InteractionSentiment[],
  ): Promise<SentimentInsights> {
    // Get additional account info, enhanced analysis, and username history
    const accountInfo = await this.getAccountInfo(profile.username);
    const usernameHistory = await this.getTwitterUsernameHistory(
      profile.username,
    );
    const twitterTweets = tweets.map((t) => ({
      id: t.tweetId,
      text: t.text,
      created_at: t.createdAt,
      author_id: 'placeholder',
      public_metrics: {
        like_count: t.metrics.likes,
        retweet_count: t.metrics.retweets,
        reply_count: t.metrics.replies,
        quote_count: t.metrics.quotes,
      },
    })) as TwitterAPITweet[];

    // Generate enhanced analysis with better error handling
    let enhancedAnalysis: any = null;
    try {
      enhancedAnalysis = await this.generateEnhancedAnalysis(
        profile.username,
        twitterTweets,
        accountInfo,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate enhanced analysis: ${error.message}`,
      );
    }

    const prompt = `
CRYPTO PROJECT TWITTER ANALYSIS - @${profile.username}

You are analyzing a crypto project's Twitter legitimacy. USE THE EXACT METRICS PROVIDED. Be specific and data-driven.

CORE METRICS:
- Communication: ${profile.communicationStyle.tone} | Authenticity: ${profile.communicationStyle.authenticity} | Trend: ${profile.sentimentTrend}

DETAILED PERFORMANCE DATA:
${
  accountInfo
    ? `
Basic Account Info:
- Followers: ${accountInfo?.followers?.toLocaleString() || 'Unknown'}
- Following: ${accountInfo?.following?.toLocaleString() || 'Unknown'}
- Account Age: ${accountInfo?.createdAt ? new Date(accountInfo.createdAt).toLocaleDateString() : 'Unknown'}
- Verified: ${accountInfo?.isVerified ? 'Yes' : 'No'}
- Blue Verified: ${accountInfo?.isBlueVerified ? 'Yes' : 'No'}
- Total Tweets: ${accountInfo?.statusesCount?.toLocaleString() || 'Unknown'}
- Bio: "${accountInfo?.description || 'No bio available'}"

Enhanced Engagement Analysis:
- Tweet Volume: ${tweets.length} tweets analyzed (${((tweets.filter((t) => !t.text.startsWith('RT @')).length / tweets.length) * 100).toFixed(0)}% original content)
- Performance: ${(tweets.reduce((sum, t) => sum + t.metrics.likes + t.metrics.retweets, 0) / tweets.length).toFixed(1)} avg engagements/tweet
${
  accountInfo
    ? `- Activity Level: ${(accountInfo.statusesCount / ((Date.now() - new Date(accountInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24))).toFixed(1)} tweets/day historical average
- Follower Context: ${accountInfo.followers?.toLocaleString() || 'Unknown'} followers (${(accountInfo.followers || 0) > 5000 ? 'excellent' : (accountInfo.followers || 0) > 1000 ? 'good' : (accountInfo.followers || 0) > 200 ? 'decent' : 'building'} for memecoin space)`
    : '- Account info unavailable from Twitter API'
}

🔍 USERNAME HISTORY ANALYSIS:
${
  usernameHistory.length > 0
    ? usernameHistory
        .map(
          (record) =>
            `- Token Project: ${record.tokenMintAddress} | Current: @${record.twitterUsername} | History: ${record.history?.length || 0} changes`,
        )
        .join('\n') +
      `\n- Username Changes: ${usernameHistory.reduce((total, record) => total + (record.history?.length || 0), 0)} total across ${usernameHistory.length} projects` +
      `\n- Stability Flag: ${usernameHistory.reduce((total, record) => total + (record.history?.length || 0), 0) > 0 ? 'USERNAME CHANGES DETECTED ⚠️' : 'No username changes ✓'}`
    : '- No username history found in database (indicates stable identity ✓)'
}

${
  enhancedAnalysis
    ? `
📊 ACTIVITY METRICS:
- Daily Activity: ${enhancedAnalysis.authenticitySignals.accountMetrics.tweetsPerDay.toFixed(1)} tweets/day
- Content Breakdown: ${enhancedAnalysis.basicMetrics.totalTweets} tweets, ${enhancedAnalysis.basicMetrics.totalReplies} replies, ${enhancedAnalysis.basicMetrics.totalRetweets} retweets
- Engagement Performance: ${enhancedAnalysis.basicMetrics.averageLikes.toFixed(1)} avg likes, ${enhancedAnalysis.basicMetrics.averageRetweets.toFixed(1)} avg retweets
- Reply Activity: ${enhancedAnalysis.engagementQuality.replyToPostRatio.toFixed(1)}x reply-to-post ratio

🎯 AUTHENTICITY ANALYSIS:
- Account Age: ${enhancedAnalysis.authenticitySignals.accountMetrics.accountAgeMonths.toFixed(1)} months (${enhancedAnalysis.authenticitySignals.accountMetrics.accountAgeMonths > 3 ? 'MATURE for memecoins' : 'Recent creation'})
- Growth Pattern: ${enhancedAnalysis.authenticitySignals.growthPattern.toUpperCase()} (${enhancedAnalysis.authenticitySignals.accountMetrics.followerToFollowingRatio.toFixed(0)}:1 follower ratio)
- Content Quality: ${(enhancedAnalysis.engagementQuality.originalContentRatio * 100).toFixed(0)}% original content, ${enhancedAnalysis.engagementQuality.viralContentCount} viral posts
- Profile Completeness: ${(enhancedAnalysis.authenticitySignals.accountMetrics.profileCompleteness * 100).toFixed(0)}% complete

⚠️ RISK INDICATORS:
- Overall Risk: ${enhancedAnalysis.riskIndicators.overallRiskLevel.toUpperCase()}
- Bot Detection: ${enhancedAnalysis.riskIndicators.suspiciousPatterns.botLikeLanguage ? 'Bot-like language detected' : 'Human-like communication'} | ${enhancedAnalysis.riskIndicators.suspiciousPatterns.repetitiveContent ? 'Repetitive content' : 'Varied content'}
- Network Health: ${enhancedAnalysis.networkAnalysis.communityHealth} (${enhancedAnalysis.networkAnalysis.influencerConnections} influencer connections)
- Engagement Rate: ${(enhancedAnalysis.engagementQuality.averageEngagementRate * 100).toFixed(2)}% (${enhancedAnalysis.engagementQuality.authenticInteractionRatio * 100}% authentic interactions)
`
    : `
Critical Analysis Points:
- Account Age: Created ${accountInfo.createdAt ? new Date(accountInfo.createdAt).toLocaleDateString() : 'Unknown'} 
- Verification Status: ${accountInfo.isVerified ? 'Legacy verified ✓' : 'No legacy verification'} ${accountInfo.isBlueVerified ? '+ Blue verified ✓' : '+ No blue verification'}
- Follower Quality: ${(accountInfo.following || 0) > 0 ? ((accountInfo.followers || 0) / (accountInfo.following || 1)).toFixed(1) : accountInfo.followers || 0} follower-to-following ratio
- Content Distribution: ${((tweets.reduce((sum, t) => sum + (t.text.includes('http') || t.text.toLowerCase().includes('buy') || t.text.toLowerCase().includes('invest') ? 1 : 0), 0) / tweets.length) * 100).toFixed(1)}% promotional content detected
`
}
`
    : 'Account metrics unavailable'
}

Recent communication patterns:
${tweets
  .slice(0, 5)
  .map(
    (tweet) =>
      `- "${tweet.text.substring(0, 100)}..." (Score: ${tweet.sentiment.overall.toFixed(2)})`,
  )
  .join('\n')}

GENERATE A COMPREHENSIVE ANALYSIS using the EXACT metrics provided above. Be data-driven, not generic.

OUTPUT FIELD INSTRUCTIONS - READ CAREFULLY:

1. **keyFindings**: 8-12 specific, data-driven bullet points using exact metrics (e.g., "4.5 tweets/day", "3.2% engagement rate")

2. **sentimentDrivers.positive**: Put POSITIVE/LEGITIMACY signals here (e.g., "Human-like communication patterns", "No username history found indicating stable identity", "Blue verification badge present", "Healthy network connections", "High engagement rates")

3. **sentimentDrivers.negative**: Put NEGATIVE/CONCERNING patterns here (e.g., "High bot activity detected", "Repetitive content patterns", "Low engagement quality")

4. **riskFactors**: Put ACTUAL RED FLAGS and SCAM INDICATORS here ONLY. Examples of ACTUAL red flags:
   - "Username changes detected across projects" 
   - "Excessive promotional content over 50%" 
   - "Bot-like repetitive content patterns"
   - "Suspicious domain links detected"
   - "High spam keyword usage"
   - "Account creation during market manipulation period"

NEVER PUT THESE IN riskFactors (they are POSITIVE signals):
   - "No username changes detected" ✓ (This is GOOD)
   - "No excessive promotional content" ✓ (This is GOOD) 
   - "Account youth may pose risks" ✗ (Unless specific scam patterns detected)
   - "Lack of historical data limits trust" ✗ (This is neutral, not a red flag)

CRITICAL CLASSIFICATION RULES:
- "No [bad thing] detected" = POSITIVE signal → goes in sentimentDrivers.positive
- "Account is new but shows good patterns" = NEUTRAL observation → goes in keyFindings
- Only put ACTUAL concerning patterns and scam indicators in riskFactors

CRITICAL SCORING LOGIC: 
- Score 90-100 = No red flags needed
- Score 70-89 = 1-2 minor red flags required 
- Score 50-69 = 2-3 moderate red flags required
- Score <50 = 3+ severe red flags required

VERIFICATION LOGIC: Blue verification IS a form of verification. Don't say "no verification" if there's blue verification. Say "premium verified" or "blue verified" instead.

USERNAME HISTORY LOGIC: "No username history found" is POSITIVE (no suspicious changes), not a red flag. It indicates transparency and stability.

REQUIREMENTS:
- Use specific numbers from the metrics  
- Reference exact follower ratio, account age, risk level
- Give memecoin-specific context for follower counts and age
- Include actionable investment insights based on the data
- Adjust number of items per section based on what's actually detected (don't force 3 items per section)
- AVOID DUPLICATE RED FLAGS: Don't repeat the same concern in different words (e.g., "account is new" should only appear once, not multiple variations)

CONTEXT: Memecoin project analysis - ${accountInfo?.followers?.toLocaleString() || 'Unknown'} followers is ${(accountInfo?.followers || 0) > 5000 ? 'excellent' : (accountInfo?.followers || 0) > 1000 ? 'good' : (accountInfo?.followers || 0) > 200 ? 'decent' : 'building'} for this sector.`;

    try {
      const llmWithSchema = this.llm.withStructuredOutput(InsightsSchema);
      const insights = await llmWithSchema.invoke(prompt);

      return {
        summary:
          insights.summary ??
          'Sentiment analysis completed with limited insights available.',
        keyFindings: insights.keyFindings ?? [
          'Analysis data available for review',
        ],
        sentimentDrivers: {
          positive: insights.sentimentDrivers?.positive ?? [
            'Positive engagement patterns',
          ],
          negative: insights.sentimentDrivers?.negative ?? [
            'Areas for improvement identified',
          ],
        },
        riskFactors: insights.riskFactors ?? ['Monitor sentiment trends'],
        communityPerception: {
          summary:
            insights.communityPerception?.summary ??
            'Community analysis in progress',
          supportLevel: insights.communityPerception?.supportLevel ?? 'medium',
          criticismLevel:
            insights.communityPerception?.criticismLevel ?? 'medium',
          engagementQuality:
            insights.communityPerception?.engagementQuality ?? 'medium',
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate insights with OpenAI', error);
      return {
        summary:
          'Sentiment analysis completed with limited insights available.',
        keyFindings: ['Analysis data available for review'],
        sentimentDrivers: {
          positive: ['Positive engagement patterns'],
          negative: ['Areas for improvement identified'],
        },
        riskFactors: ['Monitor sentiment trends'],
        communityPerception: {
          summary: 'Community analysis in progress',
          supportLevel: 'medium',
          criticismLevel: 'medium',
          engagementQuality: 'medium',
        },
      };
    }
  }

  private async generateRecommendations(
    profile: AccountSentimentProfile,
    insights: SentimentInsights,
  ): Promise<SentimentRecommendations> {
    const prompt = `
Generate actionable recommendations for improving Twitter sentiment:

Current Status:
- Overall sentiment: ${profile.overallSentiment.overall.toFixed(2)}
- Trend: ${profile.sentimentTrend}
- Authenticity: ${profile.communicationStyle.authenticity}
- Support level: ${insights.communityPerception.supportLevel}

Key insights:
${insights.keyFindings.join('\n')}

Risk factors:
${insights.riskFactors.join('\n')}

Provide specific, actionable recommendations for improving their Twitter sentiment and engagement.`;

    try {
      const llmWithSchema = this.llm.withStructuredOutput(
        RecommendationsSchema,
      );
      const recommendations = await llmWithSchema.invoke(prompt);

      return {
        immediate: recommendations.immediate ?? [
          'Monitor sentiment trends',
          'Engage authentically',
        ],
        strategic: recommendations.strategic ?? [
          'Develop consistent voice',
          'Build community trust',
        ],
        engagementStrategy: {
          recommended: recommendations.engagementStrategy?.recommended ?? [
            'Respond to comments',
            'Share others content',
          ],
          avoid: recommendations.engagementStrategy?.avoid ?? [
            'Argumentative responses',
          ],
        },
        riskMitigation: recommendations.riskMitigation ?? [
          'Regular sentiment monitoring',
          'Crisis response plan',
        ],
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate recommendations with OpenAI',
        error,
      );
      return {
        immediate: ['Monitor sentiment trends', 'Engage authentically'],
        strategic: ['Develop consistent voice', 'Build community trust'],
        engagementStrategy: {
          recommended: ['Respond to comments', 'Share others content'],
          avoid: ['Argumentative responses'],
        },
        riskMitigation: [
          'Regular sentiment monitoring',
          'Crisis response plan',
        ],
      };
    }
  }
}
