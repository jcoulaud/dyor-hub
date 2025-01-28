import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import {
  TwitterAuthenticationException,
  TwitterTokenUpdateException,
  UserNotFoundException,
} from './exceptions/auth.exceptions';
import {
  JwtPayload,
  TwitterProfile,
  TwitterTokens,
} from './interfaces/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async validateTwitterUser(profile: TwitterProfile): Promise<UserEntity> {
    try {
      this.logger.debug(`Looking up user with Twitter ID: ${profile.id}`);

      let user = await this.userRepository.findOne({
        where: { twitterId: profile.id },
      });

      if (!user) {
        this.logger.debug('Creating new user from Twitter profile');
        user = this.userRepository.create({
          twitterId: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl:
            profile.photos?.[0]?.value ||
            profile._json?.profile_image_url ||
            '',
          isVerified: profile._json?.verified || false,
          email: profile.emails?.[0]?.value,
        });
      } else {
        this.logger.debug(`Updating existing user: ${user.id}`);
        Object.assign(user, {
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl:
            profile.photos?.[0]?.value ||
            profile._json?.profile_image_url ||
            user.avatarUrl,
          isVerified: profile._json?.verified || user.isVerified,
          email: profile.emails?.[0]?.value || user.email,
        });
      }

      const savedUser = await this.userRepository.save(user);
      this.logger.debug(`User saved successfully: ${savedUser.id}`);
      return savedUser;
    } catch (error) {
      this.logger.error('Failed to validate Twitter user:', error);
      throw new TwitterAuthenticationException(
        'Failed to validate or create user from Twitter profile',
      );
    }
  }

  async updateTwitterTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    try {
      this.logger.debug(`Updating Twitter tokens for user: ${userId}`);

      const tokens: TwitterTokens = {
        accessToken,
        ...(refreshToken && { refreshToken }),
      };

      await this.userRepository.update(userId, {
        twitterAccessToken: tokens.accessToken,
        twitterRefreshToken: tokens.refreshToken,
      });

      this.logger.debug('Twitter tokens updated successfully');
    } catch (error) {
      this.logger.error(
        `Failed to update Twitter tokens for user ${userId}:`,
        error,
      );
      throw new TwitterTokenUpdateException();
    }
  }

  async login(user: UserEntity): Promise<string> {
    if (!user) {
      throw new UserNotFoundException();
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
    };

    this.logger.debug(`Creating JWT for user: ${user.id}`);
    return this.jwtService.sign(payload);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<UserEntity> {
    this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);

    if (!payload.sub) {
      throw new UserNotFoundException('Invalid token payload - no user ID');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  async findUserById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }
}
