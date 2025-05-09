import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TokenHolderAnalysisController } from './token-holder-analysis.controller';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Module({
  imports: [HttpModule, ConfigModule, TokensModule, WalletsModule],
  controllers: [TokenHolderAnalysisController],
  providers: [TokenHolderAnalysisService],
})
export class TokenHolderAnalysisModule {}
