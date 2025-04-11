import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserEntity } from '../entities/user.entity';
import { TokenCallsLeaderboardController } from './tokenCallsLeaderboard.controller';
import { TokenCallsLeaderboardService } from './tokenCallsLeaderboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([TokenCallEntity, UserEntity])],
  controllers: [TokenCallsLeaderboardController],
  providers: [TokenCallsLeaderboardService],
  exports: [TokenCallsLeaderboardService],
})
export class TokenCallsLeaderboardModule {}
