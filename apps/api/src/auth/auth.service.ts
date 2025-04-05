import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { GamificationEvent } from '../gamification/services/activity-hooks.service';
import { AuthConfigService } from './config/auth.config';
import {
  InvalidTokenException,
  TwitterTokenUpdateException,
  UserNotFoundException,
} from './exceptions/auth.exceptions';
import { JwtPayload } from './interfaces/auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly authConfigService: AuthConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validateTwitterUser(profile: any): Promise<UserEntity> {
    const { id: twitterId, username, displayName, photos } = profile;

    const defaultAvatarUrl =
      'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
    const profileImageUrl = photos?.[0]?.value || defaultAvatarUrl;
    const safeDisplayName = displayName || username;

    let user = await this.userRepository.findOne({
      where: { twitterId },
    });

    if (!user) {
      user = this.userRepository.create({
        twitterId,
        username,
        displayName: safeDisplayName,
        avatarUrl: profileImageUrl,
      });
      return await this.userRepository.save(user);
    } else {
      user.displayName = safeDisplayName;
      user.avatarUrl = profileImageUrl;
      return await this.userRepository.save(user);
    }
  }

  async updateTwitterTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        twitterAccessToken: accessToken,
        twitterRefreshToken: refreshToken || null,
      });
    } catch (error) {
      throw new TwitterTokenUpdateException(
        'Failed to update Twitter authentication tokens',
      );
    }
  }

  async login(user: UserEntity): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
    };

    this.eventEmitter.emit(GamificationEvent.USER_LOGGED_IN, {
      userId: user.id,
    });

    return this.jwtService.sign(payload, {
      secret: this.authConfigService.jwtSecret,
      expiresIn: this.authConfigService.jwtExpiresIn,
    });
  }

  async validateJwtPayload(payload: JwtPayload): Promise<UserEntity | null> {
    if (!payload?.sub) {
      throw new UserNotFoundException();
    }

    return this.userRepository.findOne({
      where: { id: payload.sub },
    });
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.authConfigService.jwtSecret,
      });
    } catch (error) {
      throw new InvalidTokenException();
    }
  }
}
