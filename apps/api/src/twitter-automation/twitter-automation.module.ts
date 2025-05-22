import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetEntity } from '../entities';
import { TokenAiTechnicalAnalysisModule } from '../token-ai-technical-analysis/token-ai-technical-analysis.module';
import { TokensModule } from '../tokens/tokens.module';
import { TwitterModule } from '../twitter/twitter.module';
import { TwitterAutomationController } from './twitter-automation.controller';
import { TwitterAutomationService } from './twitter-automation.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ScheduleModule.forRoot(),
    TokenAiTechnicalAnalysisModule,
    TypeOrmModule.forFeature([TweetEntity]),
    TokensModule,
    TwitterModule,
  ],
  providers: [TwitterAutomationService],
  controllers: [TwitterAutomationController],
})
export class TwitterAutomationModule {}
