import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensModule } from '../tokens/tokens.module';
import { TokenCallVerificationService } from './token-call-verification.service';
import { TokenCallsController } from './token-calls.controller';
import { TokenCallsService } from './token-calls.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([TokenCallEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => TokensModule),
  ],
  controllers: [TokenCallsController],
  providers: [TokenCallsService, TokenCallVerificationService],
  exports: [TokenCallsService],
})
export class TokenCallsModule {}
