import { Module } from '@nestjs/common';
import { TelegramAdminService } from './telegram-admin.service';

@Module({
  providers: [TelegramAdminService],
  exports: [TelegramAdminService],
})
export class TelegramAdminModule {}
