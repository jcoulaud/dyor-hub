import { PaginatedResult } from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { UserActivityEntity } from '../entities';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('following')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  async getFollowingFeed(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<UserActivityEntity>> {
    const userId = user.id;
    const safeLimit = Math.max(1, Math.min(100, limit));
    return this.feedService.getFollowingFeed(userId, page, safeLimit);
  }
}
