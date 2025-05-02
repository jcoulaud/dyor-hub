import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
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
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          if (req && (req as any).isPublicRoute) {
            return null;
          }
          if (!req || !req.cookies) return null;
          return req.cookies.jwt;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfigService.jwtSecret,
      passReqToCallback: true,
    });
  }

  extractJwtPayload(token: string): JwtPayload {
    try {
      return this.authService.verifyToken(token);
    } catch (error) {
      this.logger.error('Failed to extract JWT payload:', error);
      throw error;
    }
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<{ id: string } | null> {
    if (req && (req as any).isPublicRoute) {
      return null;
    }

    try {
      if (!payload || !payload.sub) {
        this.logger.debug('Invalid JWT payload');
        return null;
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: { id: true },
      });

      if (!user) {
        this.logger.debug(`No user found for sub: ${payload.sub}`);
        return null;
      }

      return { id: user.id };
    } catch (error) {
      this.logger.error('JWT Strategy - Validation failed:', error);
      return null;
    }
  }
}
