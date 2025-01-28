import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UserEntity } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { JwtPayload } from './interfaces/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly authConfigService: AuthConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const token = req?.cookies?.jwt;
        return token || null;
      },
      ignoreExpiration: false,
      secretOrKey: authConfigService.jwtSecret,
      passReqToCallback: false,
    });

    this.logger.debug('JWT Strategy initialized');
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    try {
      if (!payload) {
        return null;
      }

      this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);
      const user = await this.authService.validateJwtPayload(payload);
      this.logger.debug(`JWT validation successful for user: ${user.id}`);

      return user;
    } catch (error) {
      this.logger.error('JWT validation failed:', error);
      return null;
    }
  }
}
