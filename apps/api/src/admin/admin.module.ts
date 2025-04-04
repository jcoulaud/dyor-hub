import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BadgeEntity, UserBadgeEntity } from '../entities';
import { AdminGuard } from './admin.guard';
import { BadgeAdminController } from './controllers/badge-admin.controller';
import { BadgeAdminService } from './services/badge-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BadgeEntity, UserBadgeEntity]),
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  controllers: [BadgeAdminController],
  providers: [AdminGuard, BadgeAdminService],
  exports: [AdminGuard],
})
export class AdminModule {}
