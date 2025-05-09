import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_FEED,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { UserEntity } from '../entities/user.entity';
import { PaginatedFeedResultDto } from './dto/feed-activity.dto';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(JwtAuthGuard, TokenGatedGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('following')
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_FEED)
  async getFollowingFeed(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<PaginatedFeedResultDto> {
    limit = Math.min(limit, 50);
    return this.feedService.getFollowingFeed(user.id, page, limit);
  }
}
