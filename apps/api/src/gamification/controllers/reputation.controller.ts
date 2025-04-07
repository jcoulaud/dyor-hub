import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  LeaderboardResponseDto,
  UserReputationResponseDto,
} from '../dto/reputation.dto';
import { ReputationService } from '../services/reputation.service';

@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserReputation(
    @CurrentUser() user: { id: string },
  ): Promise<UserReputationResponseDto> {
    const userId = user.id;
    const repTrends =
      await this.reputationService.getUserReputationTrends(userId);

    const userRep = await this.reputationService.getUserReputation(userId);

    if (!userRep || !userRep.user || !userRep.user.username) {
      throw new NotFoundException(
        `User reputation data not found for user ${userId}`,
      );
    }

    return {
      userId,
      username: userRep.user.username,
      totalPoints: repTrends.totalPoints,
      weeklyPoints: repTrends.weeklyPoints,
      weeklyChange: repTrends.weeklyChange,
      lastUpdated: repTrends.lastUpdated,
    };
  }

  @Get('user/:userId')
  async getUserReputation(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserReputationResponseDto> {
    const repTrends =
      await this.reputationService.getUserReputationTrends(userId);

    const userRep = await this.reputationService.getUserReputation(userId);

    if (!userRep || !userRep.user || !userRep.user.username) {
      throw new NotFoundException(
        `User reputation data not found for user ${userId}`,
      );
    }

    return {
      userId,
      username: userRep.user.username,
      totalPoints: repTrends.totalPoints,
      weeklyPoints: repTrends.weeklyPoints,
      weeklyChange: repTrends.weeklyChange,
      lastUpdated: repTrends.lastUpdated,
    };
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<LeaderboardResponseDto> {
    const topUsers =
      await this.reputationService.getTopUsersByReputation(limit);

    return {
      users: topUsers,
      lastUpdated: new Date(),
    };
  }
}
