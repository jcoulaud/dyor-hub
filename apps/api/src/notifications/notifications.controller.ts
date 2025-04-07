import { NotificationType } from '@dyor-hub/types';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getUserNotifications(
    @CurrentUser() user: { id: string },
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      unreadOnly,
      page,
      pageSize,
    );
  }

  @Post(':id/read')
  @UseGuards(AuthGuard)
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markNotificationAsRead(
      user.id,
      notificationId,
    );
  }

  @Post('read-all')
  @UseGuards(AuthGuard)
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllNotificationsAsRead(user.id);
    return { success: true };
  }

  @Get('preferences')
  @UseGuards(AuthGuard)
  async getNotificationPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUserNotificationPreferences(user.id);
  }

  @Post('preferences/:type')
  @UseGuards(AuthGuard)
  async updateNotificationPreference(
    @CurrentUser() user: { id: string },
    @Param('type') notificationType: NotificationType,
    @Body() settings: { inApp?: boolean; email?: boolean; telegram?: boolean },
  ) {
    return this.notificationsService.updateNotificationPreference(
      user.id,
      notificationType,
      settings,
    );
  }
}
