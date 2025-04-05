import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns true for all requests but attempts to authenticate if possible
   * Always allows the request to proceed even if authentication fails
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();

      // Ensure request is properly initialized
      if (!request.user) {
        request.user = null;
      }

      const token = request?.cookies?.jwt;

      // Handle case with no token - proceed without auth
      if (!token) {
        return true;
      }

      // Try to authenticate with the token
      try {
        const payload = this.jwtService.verify(token);
        if (payload?.sub) {
          request.user = { id: payload.sub };
        }
      } catch (error) {
        // Invalid token - still allow the request
        request.user = null;
      }
    } catch (error) {
      // Any errors should still allow the request to proceed
      this.logger.error(`Error in OptionalAuthGuard: ${error.message}`);

      // Safety - make sure we have a consistent request object
      try {
        const request = context.switchToHttp().getRequest<Request>();
        request.user = null;
      } catch (e) {
        // Nothing we can do if we can't access the request
      }
    }

    // Always allow the request to proceed
    return true;
  }
}
