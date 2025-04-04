import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../admin.guard';
import { CreateBadgeDto } from '../dto/create-badge.dto';
import { UpdateBadgeDto } from '../dto/update-badge.dto';
import { BadgeAdminService } from '../services/badge-admin.service';

@Controller('admin/badges')
@UseGuards(AuthGuard, AdminGuard)
export class BadgeAdminController {
  constructor(private readonly badgeAdminService: BadgeAdminService) {}

  @Get()
  async getAllBadges() {
    return this.badgeAdminService.findAll();
  }

  @Get(':id')
  async getBadgeById(@Param('id') id: string) {
    return this.badgeAdminService.findById(id);
  }

  @Post()
  async createBadge(@Body() createBadgeDto: CreateBadgeDto) {
    return this.badgeAdminService.create(createBadgeDto);
  }

  @Put(':id')
  async updateBadge(
    @Param('id') id: string,
    @Body() updateBadgeDto: UpdateBadgeDto,
  ) {
    return this.badgeAdminService.update(id, updateBadgeDto);
  }

  @Delete(':id')
  async deleteBadge(@Param('id') id: string) {
    await this.badgeAdminService.delete(id);
    return { success: true };
  }

  @Get(':id/stats')
  async getBadgeStats(@Param('id') id: string) {
    return this.badgeAdminService.getBadgeStats(id);
  }

  @Post(':id/award')
  async awardBadgeToUser(
    @Param('id') badgeId: string,
    @Body() { userId }: { userId: string },
  ) {
    return this.badgeAdminService.awardBadgeToUser(badgeId, userId);
  }

  @Post(':id/award-bulk')
  async awardBadgeToUsers(
    @Param('id') badgeId: string,
    @Body() { userIds }: { userIds: string[] },
  ) {
    return this.badgeAdminService.awardBadgeToUsers(badgeId, userIds);
  }

  @Get('activity/recent')
  async getRecentBadgeActivity(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.badgeAdminService.getRecentActivity(limit);
  }
}
