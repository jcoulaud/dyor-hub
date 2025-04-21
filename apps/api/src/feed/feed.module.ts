import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { UserActivityEntity } from '../entities';
import { FollowsModule } from '../follows/follows.module';
import { WalletsModule } from '../wallets/wallets.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserActivityEntity]),
    forwardRef(() => FollowsModule),
    AuthModule,
    WalletsModule,
  ],
  controllers: [FeedController],
  providers: [FeedService, TokenGatedGuard],
  exports: [FeedService],
})
export class FeedModule {}
