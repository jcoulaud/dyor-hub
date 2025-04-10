import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferenceEntity } from '../../entities/notification-preference.entity';
import { TelegramUserConnectionEntity } from '../../entities/telegram-user-connection.entity';
import { TelegramUserController } from './telegram-user.controller';
import { TelegramUserService } from './telegram-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramUserConnectionEntity,
      NotificationPreferenceEntity,
    ]),
  ],
  controllers: [TelegramUserController],
  providers: [TelegramUserService],
  exports: [TelegramUserService],
})
export class TelegramUserModule {}
