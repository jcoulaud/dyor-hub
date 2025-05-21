import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsModule } from '../credits/credits.module';
import { EarlyTokenBuyerEntity, TokenEntity, WalletEntity } from '../entities';
import { UsersModule } from '../users/users.module';
import { EarlyBuyerAnalysisController } from './early-buyer-analysis.controller';
import { EarlyBuyerAnalysisService } from './early-buyer-analysis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      WalletEntity,
      EarlyTokenBuyerEntity,
    ]),
    HttpModule,
    UsersModule,
    CreditsModule,
  ],
  controllers: [EarlyBuyerAnalysisController],
  providers: [EarlyBuyerAnalysisService],
  exports: [EarlyBuyerAnalysisService],
})
export class EarlyBuyerAnalysisModule {}
