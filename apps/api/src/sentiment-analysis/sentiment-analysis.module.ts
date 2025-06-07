import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsModule } from '../credits/credits.module';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { EventsModule } from '../events/events.module';
import { TokensModule } from '../tokens/tokens.module';
import { UsersModule } from '../users/users.module';
import { SentimentAnalysisController } from './sentiment-analysis.controller';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([TwitterUsernameHistoryEntity]),
    TokensModule,
    CreditsModule,
    UsersModule,
    EventsModule,
  ],
  controllers: [SentimentAnalysisController],
  providers: [SentimentAnalysisService],
  exports: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}
