import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMethodEntity } from '../entities/auth-method.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { SolanaModule } from '../solana/solana.module';
import {
  WalletsController,
  WalletsPublicController,
} from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, UserEntity, AuthMethodEntity]),
    SolanaModule,
    CacheModule.register(),
  ],
  controllers: [WalletsController, WalletsPublicController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
