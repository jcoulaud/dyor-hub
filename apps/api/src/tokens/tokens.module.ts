import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, TwitterUsernameHistoryEntity]),
  ],
  controllers: [TokensController],
  providers: [TokensService, TwitterHistoryService],
})
export class TokensModule {}
