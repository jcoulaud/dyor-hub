import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SolanaRpcService {
  private readonly logger = new Logger(SolanaRpcService.name);
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');

    if (!heliusApiKey) {
      this.logger.warn(
        'HELIUS_API_KEY is not set. Solana RPC proxy may not work correctly.',
      );
    }

    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  async proxyRequest(requestBody: any): Promise<any> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `RPC request failed: ${response.statusText}. Details: ${errorText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error proxying RPC request:', error);
      throw new HttpException('Failed to process Solana RPC request', 500);
    }
  }
}
