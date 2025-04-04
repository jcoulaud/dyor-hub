import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import {
  WalletsController,
  WalletsPublicController,
} from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity, UserEntity])],
  controllers: [WalletsController, WalletsPublicController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
