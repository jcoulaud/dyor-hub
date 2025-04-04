import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationType,
} from '../entities';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private notificationPreferenceRepository: Repository<NotificationPreferenceEntity>,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
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
      });

      return this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserNotifications(userId: string): Promise<{
    notifications: NotificationEntity[];
    unreadCount: number;
  }> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return {
        notifications,
        unreadCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notifications for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markNotificationAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationEntity> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new Error(
          `Notification not found or does not belong to user ${userId}`,
        );
      }

      notification.isRead = true;
      return this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to mark notification as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error.message}`,
        error.stack,
      );
      throw error;
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
      throw error;
    }
  }

  async getUserNotificationPreferences(userId: string): Promise<
    Record<
      NotificationType,
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
        NotificationType,
        {
          inApp: boolean;
          email: boolean;
          telegram: boolean;
        }
      > = {} as any;

      // Initialize with defaults
      Object.values(NotificationType).forEach((type) => {
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
      throw error;
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
      throw error;
    }
  }
}
