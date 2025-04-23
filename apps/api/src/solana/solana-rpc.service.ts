import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';

@Injectable()
export class SolanaRpcService {
  private readonly logger = new Logger(SolanaRpcService.name);
  private connection: Connection;
  private heliusRpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');

    if (!heliusApiKey) {
      this.logger.error(
        'HELIUS_API_KEY is not configured. Solana features using Helius RPC will fail.',
      );
    } else {
      this.heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      try {
        this.connection = new Connection(this.heliusRpcUrl, 'confirmed');
        this.logger.log(`Solana RPC Service connected to Helius RPC.`);
      } catch (error) {
        this.logger.error(
          `Failed to create Solana connection via Helius: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error(
        'Solana connection has not been initialized. Check HELIUS_API_KEY configuration.',
      );
    }
    return this.connection;
  }

  async proxyRequest(requestBody: any): Promise<any> {
    if (!this.heliusRpcUrl) {
      this.logger.error('HELIUS_API_KEY not configured, cannot proxy request.');
      throw new Error('Proxy RPC URL not configured due to missing API key.');
    }

    try {
      const response = await fetch(this.heliusRpcUrl, {
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
