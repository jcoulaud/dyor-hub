import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../admin.guard';
import { StreakAdminService } from '../services/streak-admin.service';

@Controller('admin/streaks')
@UseGuards(AuthGuard, AdminGuard)
export class StreakAdminController {
  constructor(private readonly streakAdminService: StreakAdminService) {}

  @Get('overview')
  async getStreakOverview() {
    return this.streakAdminService.getStreakOverview();
  }

  @Get('top-users')
  async getTopStreakUsers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.streakAdminService.getTopStreakUsers(limit);
  }
}
