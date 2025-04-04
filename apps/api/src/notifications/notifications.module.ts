import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationEntity, NotificationPreferenceEntity } from '../entities';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationPreferenceEntity,
    ]),
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  providers: [NotificationsService, NotificationEventsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
