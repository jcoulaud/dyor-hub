import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieConfig, TwitterAuthConfig } from '../interfaces/auth.types';

@Injectable()
export class AuthConfigService {
  constructor(private readonly configService: ConfigService) {}

  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be configured');
    }
    return secret;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
  }

  get twitterConfig(): TwitterAuthConfig {
    const consumerKey = this.configService.get<string>('TWITTER_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>(
      'TWITTER_CONSUMER_SECRET',
    );
    const callbackURL = this.configService.get<string>('TWITTER_CALLBACK_URL');

    if (!consumerKey || !consumerSecret || !callbackURL) {
      throw new Error('Twitter configuration is incomplete');
    }

    return {
      consumerKey,
      consumerSecret,
      callbackURL,
      includeEmail: true,
      userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
    };
  }

  getCookieConfig(isDevelopment: boolean): CookieConfig {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: isDevelopment ? undefined : domain || undefined,
    };
  }

  get clientUrl(): string {
    const url = this.configService.get<string>('CLIENT_URL');
    if (!url) {
      throw new Error('CLIENT_URL must be configured');
    }
    return url;
  }

  get isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }
}
