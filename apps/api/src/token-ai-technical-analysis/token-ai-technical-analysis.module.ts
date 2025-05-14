import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AiAnalysisService } from './ai-analysis.service';
import { TokenAiTechnicalAnalysisController } from './token-ai-technical-analysis.controller';
import { TokenAiTechnicalAnalysisService } from './token-ai-technical-analysis.service';

@Module({
  imports: [WalletsModule, CreditsModule, TokensModule, HttpModule],
  providers: [AiAnalysisService, TokenAiTechnicalAnalysisService],
  controllers: [TokenAiTechnicalAnalysisController],
  exports: [AiAnalysisService, TokenAiTechnicalAnalysisService],
})
export class TokenAiTechnicalAnalysisModule {}
