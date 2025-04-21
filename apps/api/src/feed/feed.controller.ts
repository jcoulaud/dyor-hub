import {
  Controller,
  DefaultValuePipe,
  Get,
  Injectable,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserActivityEntity } from '../entities';
import { PaginatedResult } from '../users/users.service';
import { FeedService } from './feed.service';

@Injectable()
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get('following')
  async getFollowingFeed(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<UserActivityEntity>> {
    const userId = user.id;
    limit = Math.min(50, Math.max(1, limit));

    return this.feedService.getFollowingFeed(userId, page, limit);
  }
}
