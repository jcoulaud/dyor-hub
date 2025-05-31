import {
  TwitterCommunityInfo,
  TwitterTweetInfo,
  TwitterUserInfo,
} from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TwitterUserApiResponse {
  status: string;
  msg: string;
  data: TwitterUserInfo;
}

interface TwitterCommunityApiResponse {
  status: string;
  msg: string;
  community_info: TwitterCommunityInfo;
}

interface TwitterTweetApiResponse {
  status: string;
  msg: string;
  tweets: TwitterTweetInfo[];
}

@Injectable()
export class TwitterInfoService {
  private readonly logger = new Logger(TwitterInfoService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TWITTERAPI_IO_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('TWITTERAPI_IO_API_KEY environment variable is not set');
    }
  }

  private isTwitterCommunity(handle: string): boolean {
    // Check if it's a community URL format (i/communities/ID) or just a numeric ID
    return handle.startsWith('i/communities/') || /^\d+$/.test(handle);
  }

  private isTwitterTweet(handle: string): boolean {
    // Check if it's a tweet URL format (@username/status/ID)
    return handle.includes('/status/');
  }

  private extractCommunityId(handle: string): string {
    // Extract the numeric ID from community URL format
    if (handle.startsWith('i/communities/')) {
      return handle.replace('i/communities/', '');
    }
    return handle;
  }

  private extractTweetId(handle: string): string {
    // Extract tweet ID from formats like @user/status/123456789
    const match = handle.match(/\/status\/(\d+)/);
    return match ? match[1] : handle;
  }

  async getTwitterInfo(
    twitterHandle: string,
  ): Promise<TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo | null> {
    if (!twitterHandle) {
      return null;
    }

    if (!this.apiKey) {
      return null;
    }

    try {
      const isCommunity = this.isTwitterCommunity(twitterHandle);
      const isTweet = this.isTwitterTweet(twitterHandle);
      let url: string;
      let type: string;

      if (isTweet) {
        const tweetId = this.extractTweetId(twitterHandle);
        url = `https://api.twitterapi.io/twitter/tweets?tweet_ids=${encodeURIComponent(tweetId)}`;
        type = 'tweet';
      } else if (isCommunity) {
        const communityId = this.extractCommunityId(twitterHandle);
        url = `https://api.twitterapi.io/twitter/community/info?community_id=${encodeURIComponent(communityId)}`;
        type = 'community';
      } else {
        url = `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(twitterHandle)}`;
        type = 'user';
      }

      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = isTweet
        ? ((await response.json()) as TwitterTweetApiResponse)
        : isCommunity
          ? ((await response.json()) as TwitterCommunityApiResponse)
          : ((await response.json()) as TwitterUserApiResponse);

      if (data.status !== 'success') {
        return null;
      }

      if (isTweet) {
        const tweetData = data as TwitterTweetApiResponse;
        return tweetData.tweets[0] || null;
      } else if (isCommunity) {
        const communityData = data as TwitterCommunityApiResponse;
        return communityData.community_info;
      } else {
        const userData = data as TwitterUserApiResponse;
        return userData.data;
      }
    } catch (error) {
      return null;
    }
  }
}
