import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi, TwitterApiReadWrite } from 'twitter-api-v2';

@Injectable()
export class TwitterService implements OnModuleInit {
  private readonly logger = new Logger(TwitterService.name);
  private client: TwitterApiReadWrite | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('TWITTER_API_KEY');
    const apiSecret = this.configService.get<string>('TWITTER_API_SECRET');
    const accessToken = this.configService.get<string>('TWITTER_ACCESS_TOKEN');
    const accessTokenSecret = this.configService.get<string>(
      'TWITTER_ACCESS_TOKEN_SECRET',
    );

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      this.logger.error(
        'Twitter API credentials are not fully configured. Please check TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env file.',
      );
      return;
    }

    try {
      const appClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessTokenSecret,
      });
      this.client = appClient.readWrite;
      this.logger.log('Twitter client initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Twitter client', error);
      this.client = null;
    }
  }

  async postTweet(text: string): Promise<string | null> {
    if (!this.client) {
      this.logger.error(
        'Twitter client is not initialized. Cannot post tweet.',
      );
      return null;
    }

    try {
      const { data: createdTweet } = await this.client.v2.tweet(text);
      this.logger.log(
        `Tweet posted successfully! ID: ${createdTweet.id}, Text: ${createdTweet.text}`,
      );
      return createdTweet.id;
    } catch (error) {
      this.logger.error('Failed to post tweet', {
        message: error.message,
      });
      return null;
    }
  }
}
