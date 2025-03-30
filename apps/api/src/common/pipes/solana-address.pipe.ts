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

    try {
      const publicKey = new PublicKey(cleanValue);

      if (!PublicKey.isOnCurve(publicKey)) {
        throw new Error('Address is not a valid Solana address');
      }

      return cleanValue;
    } catch (error) {
      throw new BadRequestException(
        `Invalid Solana address: ${cleanValue}. Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
