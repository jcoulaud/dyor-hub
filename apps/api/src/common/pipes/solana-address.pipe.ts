import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class SolanaAddressPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(
        'Solana address must be a non-empty string',
      );
    }

    // Remove any whitespace
    const cleanValue = value.trim();

    // Basic format check
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanValue)) {
      throw new BadRequestException(
        'Invalid Solana address format. Must be base58 encoded, 32-44 characters long.',
      );
    }

    try {
      const publicKey = new PublicKey(cleanValue);
      const normalizedAddress = publicKey.toBase58();

      // Solana addresses are always 32 bytes (44 characters in base58)
      if (normalizedAddress.length !== 44) {
        throw new BadRequestException(
          'Invalid Solana address length. Must be 44 characters after normalization.',
        );
      }

      return normalizedAddress;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Invalid Solana address: ${cleanValue}. Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
