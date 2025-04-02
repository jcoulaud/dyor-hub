import { Module } from '@nestjs/common';
import { SolanaRpcController } from './solana-rpc.controller';
import { SolanaRpcService } from './solana-rpc.service';

@Module({
  controllers: [SolanaRpcController],
  providers: [SolanaRpcService],
  exports: [SolanaRpcService],
})
export class SolanaModule {}
