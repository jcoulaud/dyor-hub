import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BadgeEntity } from '../entities/badge.entity';
import { Tip } from '../entities/tip.entity';
import { UserBadgeEntity } from '../entities/user-badge.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { SolanaModule } from '../solana/solana.module';
import { TippingController } from './tipping.controller';
import { TippingService } from './tipping.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tip,
      UserEntity,
      WalletEntity,
      UserBadgeEntity,
      BadgeEntity,
    ]),
    AuthModule,
    SolanaModule,
  ],
  controllers: [TippingController],
  providers: [TippingService],
})
export class TippingModule {}
