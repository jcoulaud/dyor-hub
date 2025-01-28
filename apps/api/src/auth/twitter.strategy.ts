import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter';
import { UserEntity } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { TwitterAuthenticationException } from './exceptions/auth.exceptions';
import { TwitterProfile } from './interfaces/auth.types';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  private readonly logger = new Logger(TwitterStrategy.name);

  constructor(
    private readonly authConfigService: AuthConfigService,
    private readonly authService: AuthService,
  ) {
    super(authConfigService.twitterConfig);
    this.logger.log('Twitter strategy initialized');
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: TwitterProfile,
  ): Promise<UserEntity> {
    try {
      this.logger.debug(
        `Validating Twitter user: ${profile.username} (${profile.id})`,
      );

      const user = await this.authService.validateTwitterUser(profile);

      await this.authService.updateTwitterTokens(
        user.id,
        accessToken,
        refreshToken,
      );

      this.logger.debug(`Twitter user validated successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        'Twitter validation failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new TwitterAuthenticationException(
        error instanceof Error
          ? error.message
          : 'Twitter authentication failed',
      );
    }
  }
}
