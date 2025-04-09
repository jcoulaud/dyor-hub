import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUserConnectionEntity } from '../entities/telegram-user-connection.entity';
import { TelegramAdminModule } from './admin/telegram-admin.module';
import { TelegramUserModule } from './user/telegram-user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramUserConnectionEntity]),
    TelegramAdminModule,
    TelegramUserModule,
  ],
  exports: [TelegramAdminModule, TelegramUserModule],
})
export class TelegramModule {}
