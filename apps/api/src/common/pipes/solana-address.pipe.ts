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

    // Basic format check (32-44 characters)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanValue)) {
      throw new BadRequestException(
        'Invalid Solana address format. Must be base58 encoded, 32-44 characters long.',
      );
    }

    try {
      // Validate that it's a valid PublicKey and is on the Ed25519 curve
      const pubKey = new PublicKey(cleanValue);
      if (!PublicKey.isOnCurve(pubKey.toBytes())) {
        throw new BadRequestException(
          'Invalid Solana address. Must be a valid Ed25519 public key.',
        );
      }
      return cleanValue;
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
