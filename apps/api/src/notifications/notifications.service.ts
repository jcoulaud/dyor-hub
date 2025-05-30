import {
  NotificationItem,
  NotificationsResponse,
  NotificationType,
} from '@dyor-hub/types';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { NotificationEntity, NotificationPreferenceEntity } from '../entities';
import { TelegramUserService } from '../telegram/user/telegram-user.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private notificationPreferenceRepository: Repository<NotificationPreferenceEntity>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly telegramUserService: TelegramUserService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
    relatedMetadata?: Record<string, any> | null,
  ): Promise<NotificationEntity> {
    try {
      // Check if user has disabled this notification type
      const isEnabled = await this.isNotificationTypeEnabled(userId, type);
      if (!isEnabled) {
        this.logger.log(
          `Notification type ${type} is disabled for user ${userId}`,
        );
        return null;
      }

      const notification = this.notificationRepository.create({
        userId,
        type,
        message,
        relatedEntityId: relatedEntityId || null,
        relatedEntityType: relatedEntityType || null,
        isRead: false,
        relatedMetadata: relatedMetadata || null,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      // Send notification via WebSocket if saved successfully
      if (savedNotification) {
        this.notificationsGateway.sendNotificationToUser(
          userId,
          savedNotification,
        );

        // Check if Telegram notifications are enabled for this type
        const isTelegramEnabled = await this.isTelegramEnabledForType(
          userId,
          type,
        );
        if (isTelegramEnabled) {
          // Generate a link to the notification if relevant
          let inlineKeyboard = undefined;

          if (relatedEntityId && relatedEntityType) {
            const url = this.getNotificationUrl(
              relatedEntityType,
              relatedEntityId,
              relatedMetadata,
            );
            if (url) {
              inlineKeyboard = {
                inline_keyboard: [
                  [
                    {
                      text: '🔗 View in DYOR Hub',
                      url,
                    },
                  ],
                ],
              };
            }
          }

          // Format message for Telegram
          const telegramMessage = this.formatTelegramMessage(savedNotification);

          // Send to Telegram
          await this.telegramUserService.sendNotificationToUser(
            userId,
            telegramMessage,
            inlineKeyboard,
          );
        }
      }

      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async getUserNotifications(
    userId: string,
    unreadOnly = false,
    page = 1,
    pageSize = 10,
  ): Promise<NotificationsResponse> {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const whereOptions: FindOptionsWhere<NotificationEntity> = { userId };
      if (unreadOnly) {
        whereOptions.isRead = false;
      }

      // Get total count matching filter
      const totalCount = await this.notificationRepository.count({
        where: whereOptions,
      });

      // Get unread count separately
      const unreadCount = await this.notificationRepository.count({
        where: { userId, isRead: false },
      });

      // Get paginated notifications
      const notifications = await this.notificationRepository.find({
        where: whereOptions,
        order: { createdAt: 'DESC' },
        skip: skip,
        take: take,
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      const notificationItems: NotificationItem[] = notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        relatedEntityId: n.relatedEntityId,
        relatedEntityType: n.relatedEntityType,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        relatedMetadata: n.relatedMetadata,
      }));

      return {
        notifications: notificationItems,
        unreadCount,
        meta: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notifications for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve notifications',
      );
    }
  }

  async markNotificationAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationEntity> {
    let notification: NotificationEntity;
    try {
      notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });
    } catch (error) {
      this.logger.error(
        `DB error fetching notification ${notificationId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error finding notification to mark as read',
      );
    }

    if (!notification) {
      throw new NotFoundException(
        `Notification #${notificationId} not found or access denied`,
      );
    }

    try {
      notification.isRead = true;
      const updatedNotification =
        await this.notificationRepository.save(notification);

      // After marking as read, send the updated unread count
      await this.sendUpdatedUnreadCount(userId);

      return updatedNotification;
    } catch (error) {
      this.logger.error(
        `Failed to save read status for notification ${notificationId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to mark notification as read',
      );
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true },
      );

      // After marking all as read, send the updated unread count (which is now 0)
      await this.sendUpdatedUnreadCount(userId);
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to mark all notifications as read',
      );
    }
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    try {
      // First check if notification exists and belongs to user
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new NotFoundException(
          `Notification #${notificationId} not found or access denied`,
        );
      }

      // Delete the notification
      const result = await this.notificationRepository.delete({
        id: notificationId,
        userId,
      });

      // If notification was unread, update the unread count
      if (!notification.isRead) {
        await this.sendUpdatedUnreadCount(userId);
      }

      return result.affected > 0;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to delete notification ${notificationId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete notification');
    }
  }

  private async sendUpdatedUnreadCount(userId: string): Promise<void> {
    try {
      const unreadCount = await this.notificationRepository.count({
        where: { userId, isRead: false },
      });
      this.notificationsGateway.sendUnreadCountToUser(userId, unreadCount);
    } catch (countError) {
      this.logger.error(
        `Failed to get or send unread count for user ${userId} after update: ${countError.message}`,
        countError.stack,
      );
      // Don't throw, as the primary operation (mark as read) succeeded
    }
  }

  async isNotificationTypeEnabled(
    userId: string,
    notificationType: NotificationType,
  ): Promise<boolean> {
    try {
      const preference = await this.notificationPreferenceRepository.findOne({
        where: { userId, notificationType },
      });

      if (!preference) {
        // Default to enabled if no preference is set
        return true;
      }

      return preference.inAppEnabled;
    } catch (error) {
      this.logger.error(
        `Failed to check notification preferences: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to check notification preference',
      );
    }
  }

  async getUserNotificationPreferences(userId: string): Promise<
    Record<
      string,
      {
        inApp: boolean;
        email: boolean;
        telegram: boolean;
      }
    >
  > {
    try {
      const preferences = await this.notificationPreferenceRepository.find({
        where: { userId },
      });

      // Create default map with all notification types
      const preferencesMap: Record<
        string,
        {
          inApp: boolean;
          email: boolean;
          telegram: boolean;
        }
      > = {};

      // Initialize with defaults
      (Object.values(NotificationType) as string[]).forEach((type) => {
        preferencesMap[type] = {
          inApp: true,
          email: false,
          telegram: false,
        };
      });

      // Update with user preferences if they exist
      preferences.forEach((pref) => {
        preferencesMap[pref.notificationType] = {
          inApp: pref.inAppEnabled,
          email: pref.emailEnabled,
          telegram: pref.telegramEnabled,
        };
      });

      return preferencesMap;
    } catch (error) {
      this.logger.error(
        `Failed to get notification preferences: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve notification preferences',
      );
    }
  }

  async updateNotificationPreference(
    userId: string,
    notificationType: NotificationType,
    settings: {
      inApp?: boolean;
      email?: boolean;
      telegram?: boolean;
    },
  ): Promise<NotificationPreferenceEntity> {
    try {
      let preference = await this.notificationPreferenceRepository.findOne({
        where: { userId, notificationType },
      });

      if (!preference) {
        preference = this.notificationPreferenceRepository.create({
          userId,
          notificationType,
          inAppEnabled: true,
          emailEnabled: false,
          telegramEnabled: false,
        });
      }

      // Update only the provided settings
      if (settings.inApp !== undefined) {
        preference.inAppEnabled = settings.inApp;
      }
      if (settings.email !== undefined) {
        preference.emailEnabled = settings.email;
      }
      if (settings.telegram !== undefined) {
        preference.telegramEnabled = settings.telegram;
      }

      return this.notificationPreferenceRepository.save(preference);
    } catch (error) {
      this.logger.error(
        `Failed to update notification preference: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update notification preference',
      );
    }
  }

  // Format a notification for Telegram with emojis and formatting
  private formatTelegramMessage(notification: NotificationEntity): string {
    const { type, message } = notification;

    // Add emoji based on notification type
    let emoji = '🔔';
    switch (type) {
      case NotificationType.STREAK_AT_RISK:
        emoji = '⚠️';
        break;
      case NotificationType.STREAK_ACHIEVED:
        emoji = '🔥';
        break;
      case NotificationType.STREAK_BROKEN:
        emoji = '💔';
        break;
      case NotificationType.BADGE_EARNED:
        emoji = '🏆';
        break;
      case NotificationType.LEADERBOARD_CHANGE:
        emoji = '📊';
        break;
      case NotificationType.REPUTATION_MILESTONE:
        emoji = '⭐';
        break;
      case NotificationType.COMMENT_REPLY:
        emoji = '💬';
        break;
      case NotificationType.UPVOTE_RECEIVED:
        emoji = '👍';
        break;
      case NotificationType.SYSTEM:
        emoji = '🔔';
        break;
      case NotificationType.TOKEN_CALL_VERIFIED:
        const callStatus = notification.relatedMetadata?.status;
        emoji = callStatus === 'success' ? '✅' : '❌';
        break;
      case NotificationType.REFERRAL_SUCCESS:
        emoji = '🤝';
        break;
      case NotificationType.TIP_RECEIVED:
        emoji = '💰';
        break;
      case NotificationType.FOLLOWED_USER_PREDICTION:
      case NotificationType.FOLLOWED_USER_COMMENT:
      case NotificationType.FOLLOWED_USER_VOTE:
        emoji = '👥';
        break;
    }

    return `${emoji} <b>${this.getNotificationTypeTitle(type)}</b>\n\n${message}`;
  }

  private getNotificationTypeTitle(type: NotificationType): string {
    switch (type) {
      case NotificationType.TOKEN_CALL_VERIFIED:
        return 'Token Call Result';
      case NotificationType.STREAK_AT_RISK:
        return 'Streak at Risk';
      case NotificationType.STREAK_ACHIEVED:
        return 'Streak Achieved';
      case NotificationType.STREAK_BROKEN:
        return 'Streak Broken';
      case NotificationType.BADGE_EARNED:
        return 'Badge Earned';
      case NotificationType.LEADERBOARD_CHANGE:
        return 'Leaderboard Update';
      case NotificationType.REPUTATION_MILESTONE:
        return 'Reputation Milestone';
      case NotificationType.COMMENT_REPLY:
        return 'Comment Reply';
      case NotificationType.UPVOTE_RECEIVED:
        return 'Upvote Received';
      case NotificationType.SYSTEM:
        return 'System Notification';
      case NotificationType.FOLLOWED_USER_PREDICTION:
        return 'User You Follow';
      case NotificationType.FOLLOWED_USER_COMMENT:
        return 'User You Follow';
      case NotificationType.FOLLOWED_USER_VOTE:
        return 'User You Follow';
      case NotificationType.REFERRAL_SUCCESS:
        return 'Referral Success';
      case NotificationType.TIP_RECEIVED:
        return 'Tip Received';
      default:
        return 'Notification';
    }
  }

  private getNotificationUrl(
    entityType: string,
    entityId: string,
    metadata?: Record<string, any> | null,
  ): string | null {
    const baseUrl = process.env.CLIENT_URL || '';

    switch (entityType) {
      case 'comment':
        if (metadata && metadata.tokenMintAddress) {
          return `${baseUrl}/tokens/${metadata.tokenMintAddress}/comments/${entityId}`;
        } else if (metadata && metadata.contentType === 'comment') {
          this.logger.warn(
            `Missing tokenMintAddress for comment notification link: ${entityId}`,
          );
          return null;
        }
        break;
      case 'badge':
        return `${baseUrl}/account/badges`;
      case 'token_call':
        return `${baseUrl}/token-calls/${entityId}`;
      case 'referrals':
        return `${baseUrl}/account/referrals?tab=history`;
      case 'user':
        if (metadata && metadata.senderId) {
          return null;
        }
        break;
      default:
        return null;
    }

    return null;
  }

  // Check if Telegram notifications are enabled for a specific notification type
  async isTelegramEnabledForType(
    userId: string,
    notificationType: NotificationType,
  ): Promise<boolean> {
    try {
      // First check if user has a Telegram connection
      const hasConnection =
        await this.telegramUserService.hasActiveConnection(userId);
      if (!hasConnection) {
        return false;
      }

      // Then check if the notification type has Telegram enabled
      const preference = await this.notificationPreferenceRepository.findOne({
        where: { userId, notificationType },
      });

      if (!preference) {
        // If no preference is found, use default value (false for Telegram)
        return false;
      }

      return preference.telegramEnabled;
    } catch (error) {
      this.logger.error(
        `Failed to check if Telegram is enabled for ${notificationType}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
