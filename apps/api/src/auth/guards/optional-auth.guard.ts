import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.jwt;

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        request.user = { id: payload.sub };
      } catch (error) {
        // Ignore token errors in optional auth
      }
    }

    return true;
  }
}
