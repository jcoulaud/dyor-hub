import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentimentAnalysisController } from './sentiment-analysis.controller';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [SentimentAnalysisController],
  providers: [SentimentAnalysisService],
  exports: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}
