import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { createClient } from 'redis';
import { TwitterApi } from 'twitter-api-v2';
import { ReferralService } from '../referral/referral.service';
import { AuthService } from './auth.service';
import { TwitterProfile } from './interfaces/auth.types';

// Extend the Express session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
    codeVerifier?: string;
    state?: string;
  }
}

interface TwitterAuthStateData {
  codeVerifier: string;
  returnTo?: string;
  usePopup?: boolean;
  referralCode?: string;
  userId?: string;
  isLinking?: boolean;
  callbackUrl?: string;
  createdAt: string;
}

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  private readonly logger = new Logger(TwitterStrategy.name);
  private readonly twitterClient: TwitterApi;
  private readonly callbackUrl: string;
  private readonly clientUrl: string;
  private readonly isDevelopment: boolean;
  private readonly useApiSubdomain: boolean;
  private readonly redisClient;
  private readonly redisPrefix = 'twitter_auth:';
  private readonly stateTTL = 10 * 60; // 10 minutes in seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly referralService: ReferralService,
  ) {
    super();

    this.isDevelopment =
      this.configService.get<string>('NODE_ENV') !== 'production';
    this.useApiSubdomain = this.configService.get<boolean>('USE_API_SUBDOMAIN');

    const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'TWITTER_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new Error('Twitter client credentials are not configured properly');
    }

    this.callbackUrl = this.configService.get<string>('TWITTER_CALLBACK_URL');
    this.clientUrl = this.configService.get<string>('CLIENT_URL');

    this.twitterClient = new TwitterApi({
      clientId,
      clientSecret,
    });

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable not found');
    }

    this.redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });

    this.redisClient.connect().catch((err) => {
      throw err;
    });
  }

  async validate(req: Request): Promise<any> {
    if (req.query.return_to && req.session) {
      req.session.returnTo = req.query.return_to as string;
    }

    if (req.query.error === 'access_denied' || req.query.denied) {
      const state = req.query.state as string;
      if (state) {
        await this.deleteAuthStateData(state);
      }
      return {
        redirectUrl: `${this.clientUrl}?auth_error=${encodeURIComponent('Authentication cancelled by user')}`,
        cancelled: true,
      };
    }

    if (!req.query.code) {
      const authLink = await this.getAuthLink(req);
      return { redirectUrl: authLink };
    }

    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!state) {
        throw new Error('Missing state parameter in request');
      }

      const stateData = await this.getAuthStateData(state);

      if (!stateData || !stateData.codeVerifier) {
        throw new Error(
          'Authentication state data is missing or expired. Please try the authentication process again.',
        );
      }

      const codeVerifier = stateData.codeVerifier;
      const returnTo = stateData.returnTo;
      const usePopup = stateData.usePopup;
      const referralCodeFromState = stateData.referralCode;

      if (returnTo && req.session) {
        req.session.returnTo = returnTo;
      }

      try {
        const callbackUrl = stateData.callbackUrl || this.callbackUrl;

        const { accessToken } = await this.twitterClient.loginWithOAuth2({
          code,
          codeVerifier,
          redirectUri: callbackUrl,
        });

        const twitterClient = new TwitterApi(accessToken);
        const { data: userInfo } = await twitterClient.v2.me({
          'user.fields': ['id', 'name', 'username', 'profile_image_url'],
        });

        const defaultAvatarUrl =
          'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
        const profileImageUrl = userInfo.profile_image_url || defaultAvatarUrl;

        const twitterProfile: TwitterProfile = {
          id: userInfo.id,
          displayName: userInfo.name || userInfo.username,
          username: userInfo.username,
          photos: [{ value: profileImageUrl }],
          emails: [],
          provider: 'twitter',
          _json: {
            id_str: userInfo.id,
            name: userInfo.name || userInfo.username,
            screen_name: userInfo.username,
            profile_image_url_https: profileImageUrl,
            verified: false,
          },
        };

        // Check if this is a linking flow
        const userId = stateData.userId;
        const isLinking = stateData.isLinking;

        if (isLinking && userId) {
          await this.deleteAuthStateData(state);
          return {
            ...twitterProfile,
            usePopup,
            isLinking: true,
            userId,
            returnTo,
          };
        }

        // Regular authentication flow
        const validationResult =
          await this.authService.validateTwitterUser(twitterProfile);
        const user = validationResult.user;
        const isNewUser = validationResult.isNew;

        await this.authService.updateTwitterTokens(user.id, accessToken);

        if (isNewUser && referralCodeFromState) {
          this.logger.log(
            `Processing referral for new user ${user.id} with code ${referralCodeFromState}`,
          );
          this.referralService
            .processReferral(referralCodeFromState, user.id)
            .catch((err) => {
              this.logger.error(
                `Background referral processing failed for user ${user.id}: ${err.message}`,
                err.stack,
              );
            });
        }

        await this.deleteAuthStateData(state);

        return { ...user, usePopup };
      } catch (error) {
        this.logger.error(`Error exchanging code for tokens: ${error.message}`);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Twitter authentication error: ${error.message}`);
      throw error;
    }
  }

  private async getAuthLink(req: Request): Promise<string> {
    try {
      let callbackUrl = this.callbackUrl;
      const isLinking = req.url?.includes('/twitter-link');

      if (isLinking) {
        callbackUrl = callbackUrl.replace(
          '/twitter/callback',
          '/twitter-link/callback',
        );
      }

      const { url, codeVerifier, state } =
        this.twitterClient.generateOAuth2AuthLink(callbackUrl, {
          scope: ['tweet.read', 'users.read'],
        });

      const referralCode = req.query.referralCode as string | undefined;
      const userId = req.query.userId as string | undefined;

      const stateData: TwitterAuthStateData = {
        codeVerifier,
        returnTo: (req.query.return_to as string) || req.session?.returnTo,
        usePopup: req.query.use_popup === 'true',
        referralCode,
        userId,
        isLinking,
        callbackUrl,
        createdAt: new Date().toISOString(),
      };

      await this.storeAuthStateData(state, stateData);
      return url;
    } catch (error) {
      this.logger.error(`Error generating Twitter auth link: ${error.message}`);
      throw error;
    }
  }

  private async storeAuthStateData(
    state: string,
    data: TwitterAuthStateData,
  ): Promise<void> {
    const key = `${this.redisPrefix}${state}`;
    try {
      await this.redisClient.set(key, JSON.stringify(data), {
        EX: this.stateTTL,
      });
    } catch (error) {
      this.logger.error(`Failed to store auth state data: ${error.message}`);
      throw error;
    }
  }

  private async getAuthStateData(
    state: string,
  ): Promise<TwitterAuthStateData | null> {
    const key = `${this.redisPrefix}${state}`;
    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as TwitterAuthStateData;
    } catch (error) {
      this.logger.error(`Failed to retrieve auth state data: ${error.message}`);
      return null;
    }
  }

  private async deleteAuthStateData(state: string): Promise<void> {
    const key = `${this.redisPrefix}${state}`;
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete auth state data: ${error.message}`);
    }
  }
}
