import { Body, Controller, Logger, Post } from '@nestjs/common';
import { SolanaRpcService } from './solana-rpc.service';

@Controller('solana-rpc')
export class SolanaRpcController {
  private readonly logger = new Logger(SolanaRpcController.name);

  constructor(private readonly solanaRpcService: SolanaRpcService) {}

  @Post()
  async proxyRpcRequest(@Body() requestBody: any) {
    try {
      return await this.solanaRpcService.proxyRequest(requestBody);
    } catch (error) {
      this.logger.error('Failed to proxy Solana RPC request', error);
      throw error;
    }
  }
}
