import { WalletEntity } from '../../entities/wallet.entity';

export class WalletResponseDto {
  id: string;
  address: string;
  isVerified: boolean;
  isPrimary: boolean;

  constructor(partial: Partial<WalletResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(entity: WalletEntity): WalletResponseDto {
    return new WalletResponseDto({
      id: entity.id,
      address: entity.address,
      isVerified: entity.isVerified,
      isPrimary: entity.isPrimary || false,
    });
  }
}
