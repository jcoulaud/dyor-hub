import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditsModule } from '../credits/credits.module';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TopTradersAnalysisController } from './top-traders-analysis.controller';
import { TopTradersAnalysisService } from './top-traders-analysis.service';

@Module({
  imports: [ConfigModule, CreditsModule, UsersModule, WalletsModule],
  controllers: [TopTradersAnalysisController],
  providers: [TopTradersAnalysisService],
  exports: [TopTradersAnalysisService],
})
export class TopTradersAnalysisModule {}
