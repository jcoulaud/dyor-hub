import {
  AccountSentimentProfile,
  InteractionSentiment,
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
  SentimentInsights,
  SentimentRecommendations,
  TweetSentiment,
  TwitterAPIResponse,
  TwitterAPITweet,
  TwitterAPIUser,
} from '@dyor-hub/types';
import { ChatOpenAI } from '@langchain/openai';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

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

const BatchTweetAnalysisSchema = z.array(TweetAnalysisSchema);

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
  keyFindings: z.array(z.string()).describe('Key findings'),
  sentimentDrivers: z.object({
    positive: z.array(z.string()).describe('What creates positive sentiment'),
    negative: z.array(z.string()).describe('What creates negative sentiment'),
  }),
  riskFactors: z.array(z.string()).describe('Risk factors'),
  opportunities: z.array(z.string()).describe('Opportunities'),
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
  contentStrategy: z.object({
    recommended: z.array(z.string()).describe('Recommended content approaches'),
    avoid: z.array(z.string()).describe('Content approaches to avoid'),
  }),
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
      modelName: 'gpt-4-turbo',
      temperature: 0.1,
    });

    this.logger.log('SentimentAnalysisService initialized successfully');
  }

  async analyzeSentiment(
    request: SentimentAnalysisRequest,
  ): Promise<SentimentAnalysisResponse> {
    this.logger.log(`Starting sentiment analysis for @${request.username}`);

    try {
      // 1. Collect Twitter data
      const twitterData = await this.collectTwitterData(request);

      // 2. Analyze tweets with OpenAI
      const tweetSentiments = await this.analyzeTweetSentiments(
        twitterData.tweets,
      );

      // 3. Analyze interactions if requested
      const interactions = request.options?.includeReplies
        ? await this.analyzeInteractions(request.username, twitterData.tweets)
        : [];

      // 4. Create account sentiment profile
      const profile = await this.createAccountProfile(
        request.username,
        tweetSentiments,
        twitterData.userInfo,
        request,
      );

      // 5. Generate insights and recommendations
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
        recentTweets: tweetSentiments.slice(0, 20), // Most recent 20
        interactions,
        insights,
        recommendations,
      };

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
    this.logger.log(`Collecting Twitter data for @${request.username}`);

    const maxTweets = request.options?.maxTweets || 100;
    const tweets: TwitterAPITweet[] = [];
    let userInfo: TwitterAPIUser | null = null;

    try {
      // Get user's tweets
      const tweetsResponse = await firstValueFrom(
        this.httpService.get<TwitterAPIResponse>(
          'https://api.twitterapi.io/tweets/search',
          {
            headers: {
              'X-API-Key': this.twitterApiKey,
            },
            params: {
              query: `from:${request.username}`,
              max_results: Math.min(maxTweets, 100),
              'tweet.fields': 'created_at,public_metrics,author_id',
              expansions: 'author_id',
              'user.fields': 'username,name,profile_image_url',
              ...(request.dateRange?.from && {
                start_time: new Date(request.dateRange.from).toISOString(),
              }),
              ...(request.dateRange?.to && {
                end_time: new Date(request.dateRange.to).toISOString(),
              }),
            },
          },
        ),
      );

      if (tweetsResponse.data?.data) {
        tweets.push(...tweetsResponse.data.data);
        userInfo = tweetsResponse.data.includes?.users?.[0] || null;
      }

      // Get mentions if requested
      if (request.options?.includeMentions) {
        const mentionsResponse = await firstValueFrom(
          this.httpService.get<TwitterAPIResponse>(
            'https://api.twitterapi.io/tweets/search',
            {
              headers: {
                'X-API-Key': this.twitterApiKey,
              },
              params: {
                query: `@${request.username} -from:${request.username}`,
                max_results: 50,
                'tweet.fields': 'created_at,public_metrics,author_id',
                expansions: 'author_id',
                'user.fields': 'username,name,profile_image_url',
              },
            },
          ),
        );

        if (mentionsResponse.data?.data) {
          tweets.push(...mentionsResponse.data.data);
        }
      }

      this.logger.log(`Collected ${tweets.length} tweets for analysis`);
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
  ): Promise<TweetSentiment[]> {
    this.logger.log(`Analyzing sentiment for ${tweets.length} tweets`);

    const batchSize = 10; // Process tweets in batches to manage API costs
    const results: TweetSentiment[] = [];

    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);
      const batchResults = await this.processTweetBatch(batch);
      results.push(...batchResults);
    }

    return results;
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
      const llmWithSchema = this.llm.withStructuredOutput(
        BatchTweetAnalysisSchema,
      );
      const analysis = await llmWithSchema.invoke(prompt);

      return tweets.map((tweet, index) => {
        const sentimentData = analysis[index] || {
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
        'Failed to analyze tweet sentiments with OpenAI',
        error,
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
    // For now, return empty array - can be implemented later
    // This would involve getting replies to each tweet and analyzing them
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
          sentimentIndicators:
            analysis.overallSentiment.sentimentIndicators ?? [],
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
              sentimentIndicators: value.sentimentIndicators ?? [],
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
          tone: analysis.communicationStyle?.tone ?? 'mixed',
          authenticity: analysis.communicationStyle?.authenticity ?? 'medium',
          responsiveness:
            analysis.communicationStyle?.responsiveness ?? 'moderate',
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
          sentimentIndicators: [],
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
          tone: 'mixed',
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

  private async generateInsights(
    profile: AccountSentimentProfile,
    tweets: TweetSentiment[],
    interactions: InteractionSentiment[],
  ): Promise<SentimentInsights> {
    const prompt = `
Generate actionable insights for this Twitter account:

Account: @${profile.username}
Overall Sentiment: ${profile.overallSentiment.overall.toFixed(2)}
Sentiment Trend: ${profile.sentimentTrend}
Communication Style: ${profile.communicationStyle.tone}
Authenticity: ${profile.communicationStyle.authenticity}

Recent tweets analysis:
${tweets
  .slice(0, 10)
  .map(
    (tweet) =>
      `- "${tweet.text}" (Sentiment: ${tweet.sentiment.overall.toFixed(2)})`,
  )
  .join('\n')}

Provide strategic insights:
1. Summary of current sentiment position
2. Key findings about their content and community
3. What drives positive vs negative sentiment
4. Risk factors and opportunities
5. Community perception assessment

Generate comprehensive insights about this account's sentiment profile.`;

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
        opportunities: insights.opportunities ?? ['Optimize content strategy'],
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
        opportunities: ['Optimize content strategy'],
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
        contentStrategy: {
          recommended: recommendations.contentStrategy?.recommended ?? [
            'Share valuable insights',
            'Engage in discussions',
          ],
          avoid: recommendations.contentStrategy?.avoid ?? [
            'Controversial topics',
            'Over-promotion',
          ],
        },
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
        contentStrategy: {
          recommended: ['Share valuable insights', 'Engage in discussions'],
          avoid: ['Controversial topics', 'Over-promotion'],
        },
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
