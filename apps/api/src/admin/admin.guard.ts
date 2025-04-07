import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from '../entities';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserEntity;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    return true;
  }
}
