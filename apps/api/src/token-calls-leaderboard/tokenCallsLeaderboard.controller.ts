import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { LeaderboardQueryDto } from './dto/tokenCallsLeaderboard-query.dto';
import {
  PaginatedLeaderboardResult,
  TokenCallsLeaderboardService,
} from './tokenCallsLeaderboard.service';

@Controller('leaderboards')
@UseInterceptors(ClassSerializerInterceptor)
export class TokenCallsLeaderboardController {
  private readonly logger = new Logger(TokenCallsLeaderboardController.name);

  constructor(
    private readonly leaderboardsService: TokenCallsLeaderboardService,
  ) {}

  @Public()
  @Get('token-calls')
  async getTokenCallLeaderboard(
    @Query() queryDto: LeaderboardQueryDto,
  ): Promise<PaginatedLeaderboardResult> {
    try {
      return await this.leaderboardsService.getTokenCallLeaderboard(queryDto);
    } catch (error) {
      this.logger.error('Error fetching token call leaderboard:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve leaderboard data.',
      );
    }
  }
}
