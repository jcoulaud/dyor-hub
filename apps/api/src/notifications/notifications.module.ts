import { forwardRef, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  CommentEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
} from '../entities';
import { GamificationModule } from '../gamification/gamification.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationPreferenceEntity,
      CommentEntity,
    ]),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => GamificationModule),
    TelegramModule,
  ],
  providers: [
    NotificationsService,
    NotificationEventsService,
    NotificationsGateway,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
