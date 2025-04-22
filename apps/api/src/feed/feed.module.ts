import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserActivityEntity } from '../entities';
import { FollowsModule } from '../follows/follows.module';
import { WalletsModule } from '../wallets/wallets.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserActivityEntity]),
    FollowsModule,
    WalletsModule,
    AuthModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
