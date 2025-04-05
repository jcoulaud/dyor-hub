import { ActivityPointsConfig, LeaderboardResponse } from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReputationService } from '../../gamification/services/reputation.service';
import { AdminGuard } from '../admin.guard';

@Controller('admin/reputation')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ReputationAdminController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('activities/points')
  getActivityPointValues(): ActivityPointsConfig {
    return this.reputationService.getActivityPointValues();
  }

  @Get('top-users')
  async getTopUsersByReputation(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<LeaderboardResponse> {
    const users = await this.reputationService.getTopUsersByReputation(limit);

    return {
      users,
      timestamp: new Date(),
    };
  }
}
