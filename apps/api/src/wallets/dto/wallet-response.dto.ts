import { WalletEntity } from '../../entities/wallet.entity';

export class WalletResponseDto {
  id: string;
  address: string;
  isVerified: boolean;
  isPrimary: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;

  constructor(partial: Partial<WalletResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(wallet: WalletEntity): WalletResponseDto {
    return new WalletResponseDto({
      id: wallet.id,
      address: wallet.address,
      isVerified: wallet.isVerified,
      isPrimary: wallet.isPrimary,
      userId: wallet.userId,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    });
  }
}
