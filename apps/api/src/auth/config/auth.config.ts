import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieConfig, TwitterAuthConfig } from '../interfaces/auth.types';

@Injectable()
export class AuthConfigService {
  private readonly logger = new Logger(AuthConfigService.name);

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
    const clientId = this.configService
      .get<string>('TWITTER_CLIENT_ID')
      ?.trim();
    const clientSecret = this.configService
      .get<string>('TWITTER_CLIENT_SECRET')
      ?.trim();

    // Get the callback URL from environment or generate it dynamically
    let callbackURL = this.configService
      .get<string>('TWITTER_CALLBACK_URL')
      ?.trim();

    // In production, if the callback URL contains the main domain with /api,
    // replace it with the API subdomain
    if (!this.isDevelopment && callbackURL) {
      try {
        const url = new URL(callbackURL);
        // Check if the URL contains /api in the path
        if (url.pathname.includes('/api/')) {
          // Get the client URL to extract the main domain
          const clientUrl = new URL(this.clientUrl);
          // Create a new URL with api subdomain
          const apiHostname = `api.${clientUrl.hostname}`;
          // Reconstruct the URL with the API subdomain and without /api in the path
          const pathWithoutApi = url.pathname.replace('/api', '');
          callbackURL = `${url.protocol}//${apiHostname}${pathWithoutApi}`;
          this.logger.log(
            `Using dynamically generated callback URL: ${callbackURL}`,
          );
        }
      } catch (error) {
        // If URL parsing fails, keep the original callback URL
        this.logger.warn(`Failed to parse callback URL: ${error.message}`);
      }
    }

    // Validate required configuration
    const missingFields = [
      !clientId && 'TWITTER_CLIENT_ID',
      !clientSecret && 'TWITTER_CLIENT_SECRET',
      !callbackURL && 'TWITTER_CALLBACK_URL',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      const errorMessage = `Twitter configuration is incomplete. Missing: ${missingFields.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validate callback URL format
    try {
      new URL(callbackURL);
    } catch (error) {
      const errorMessage = `Invalid Twitter callback URL: ${callbackURL}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      clientId,
      clientSecret,
      callbackURL,
      // OAuth 2.0 specific settings
      scope: ['tweet.read', 'users.read', 'offline.access'],
      state: true,
      pkce: true,
    };
  }

  getCookieConfig(isDevelopment: boolean): CookieConfig {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'none',
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
