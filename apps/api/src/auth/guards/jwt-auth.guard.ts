import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any): any {
    if (err || !user) {
      throw new UnauthorizedException(
        'You must be authenticated to perform this action',
      );
    }

    return user;
  }
}
