import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditsModule } from '../credits/credits.module';
import { EventsModule } from '../events/events.module';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TokenHolderAnalysisController } from './token-holder-analysis.controller';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TokensModule,
    WalletsModule,
    CreditsModule,
    EventsModule,
  ],
  controllers: [TokenHolderAnalysisController],
  providers: [TokenHolderAnalysisService],
})
export class TokenHolderAnalysisModule {}
