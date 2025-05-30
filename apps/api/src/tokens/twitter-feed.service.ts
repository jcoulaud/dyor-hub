import { TwitterFeedResponse, TwitterFeedTweet } from '@dyor-hub/types';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface TwitterApiIOTweet {
  type: string;
  id: string;
  url: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId?: string;
  conversationId: string;
  inReplyToUserId?: string;
  inReplyToUsername?: string;
  author: {
    type: string;
    userName: string;
    url: string;
    id: string;
    name: string;
    isBlueVerified: boolean;
    verifiedType: string;
    profilePicture: string;
    coverPicture: string;
    description: string;
    location: string;
    followers: number;
    following: number;
    canDm: boolean;
    createdAt: string;
    favouritesCount: number;
    hasCustomTimelines: boolean;
    isTranslator: boolean;
    mediaCount: number;
    statusesCount: number;
    withheldInCountries: string[];
    affiliatesHighlightedLabel: Record<string, unknown>;
    possiblySensitive: boolean;
    pinnedTweetIds: string[];
    isAutomated: boolean;
    automatedBy: string;
    unavailable: boolean;
    message: string;
    unavailableReason: string;
  };
  entities: {
    hashtags: Array<{
      indices: number[];
      text: string;
    }>;
    urls: Array<{
      display_url: string;
      expanded_url: string;
      indices: number[];
      url: string;
    }>;
    user_mentions: Array<{
      id_str: string;
      name: string;
      screen_name: string;
    }>;
  };
  extendedEntities?: {
    media?: Array<{
      id_str: string;
      media_url_https: string;
      type: string;
      sizes: {
        large: {
          h: number;
          w: number;
        };
      };
      display_url: string;
      expanded_url: string;
      indices: number[];
      url: string;
    }>;
  };
  quoted_tweet?: Record<string, unknown>;
  retweeted_tweet?: Record<string, unknown>;
}

interface TwitterApiIOResponse {
  status: string;
  code: number;
  msg: string;
  data: {
    pin_tweet: any;
    tweets: TwitterApiIOTweet[];
    has_next_page: boolean;
    next_cursor?: string;
  };
}

@Injectable()
export class TwitterFeedService {
  private readonly logger = new Logger(TwitterFeedService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.twitterapi.io/twitter';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('TWITTERAPI_IO_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'TwitterAPI.io API key not found. Twitter feed will be disabled.',
      );
    }
  }

  async getLatestTweets(
    username: string,
    cursor?: string,
  ): Promise<TwitterFeedResponse | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn('TwitterAPI.io client not initialized');
        return null;
      }

      // Remove @ symbol if present
      const cleanUsername = username.startsWith('@')
        ? username.slice(1)
        : username;

      const params: Record<string, string> = {
        userName: cleanUsername,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const url = `${this.baseUrl}/user/last_tweets`;
      const queryString = new URLSearchParams(params).toString();

      const response = await firstValueFrom(
        this.httpService.get<TwitterApiIOResponse>(`${url}?${queryString}`, {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      if (!response.data?.data?.tweets || response.data.status !== 'success') {
        return {
          tweets: [],
          meta: {
            resultCount: 0,
          },
        };
      }

      const tweets: TwitterFeedTweet[] = response.data.data.tweets.map(
        (tweet) => {
          const referencedTweets = [];
          if (tweet.inReplyToId) {
            referencedTweets.push({
              type: 'replied_to' as const,
              id: tweet.inReplyToId,
            });
          }
          if (tweet.quoted_tweet) {
            referencedTweets.push({
              type: 'quoted' as const,
              id: tweet.id,
            });
          }
          if (tweet.retweeted_tweet) {
            referencedTweets.push({
              type: 'retweeted' as const,
              id: tweet.id,
            });
          }

          let createdAt = tweet.createdAt;
          try {
            const twitterDate = new Date(tweet.createdAt);
            if (!isNaN(twitterDate.getTime())) {
              createdAt = twitterDate.toISOString();
            }
          } catch (error) {
            this.logger.warn(`Failed to parse date: ${tweet.createdAt}`);
          }

          const media =
            tweet.extendedEntities?.media?.map((mediaItem) => ({
              mediaKey: mediaItem.id_str,
              type: mediaItem.type as 'photo' | 'video',
              url: mediaItem.media_url_https,
              height: mediaItem.sizes.large.h,
              width: mediaItem.sizes.large.w,
              previewImageUrl:
                mediaItem.type === 'video'
                  ? mediaItem.media_url_https
                  : undefined,
            })) || [];

          return {
            id: tweet.id,
            text: tweet.text,
            authorId: tweet.author.id,
            authorUsername: tweet.author.userName,
            authorDisplayName: tweet.author.name,
            authorProfileImageUrl: tweet.author.profilePicture,
            createdAt,
            publicMetrics: {
              retweetCount: tweet.retweetCount || 0,
              likeCount: tweet.likeCount || 0,
              replyCount: tweet.replyCount || 0,
              quoteCount: tweet.quoteCount || 0,
            },
            referencedTweets:
              referencedTweets.length > 0 ? referencedTweets : undefined,
            attachments: undefined,
            media: media.length > 0 ? media : undefined,
          };
        },
      );

      const feedResponse: TwitterFeedResponse = {
        tweets,
        meta: {
          resultCount: tweets.length,
          nextToken: response.data.data.has_next_page
            ? response.data.data.next_cursor
            : undefined,
        },
      };

      return feedResponse;
    } catch {
      return null;
    }
  }

  isTwitterClientAvailable(): boolean {
    return !!this.apiKey;
  }
}
