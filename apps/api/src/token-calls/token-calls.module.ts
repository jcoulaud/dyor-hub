import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensModule } from '../tokens/tokens.module';
import { TokenCallsController } from './token-calls.controller';
import { TokenCallsService } from './token-calls.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenCallEntity]),
    AuthModule,
    forwardRef(() => TokensModule),
  ],
  controllers: [TokenCallsController],
  providers: [TokenCallsService],
})
export class TokenCallsModule {}
