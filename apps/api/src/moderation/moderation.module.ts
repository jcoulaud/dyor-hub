import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';

@Module({
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
