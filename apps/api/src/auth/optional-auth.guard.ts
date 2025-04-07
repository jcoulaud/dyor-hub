import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.jwt;

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;

        if (userId) {
          const user = await this.usersService.findById(userId);
          // Attach user to request if found, otherwise proceed without it
          if (user) {
            // Extend Request interface or use assertion if needed for type safety
            (request as any).user = user;
          }
        }
      } catch (error) {
        // Ignore errors (invalid token, expired, etc.)
        // Request proceeds without authenticated user attached.
      }
    }

    // Always allow access, regardless of authentication success.
    return true;
  }
}
