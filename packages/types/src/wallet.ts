export interface WalletResponse {
  id: string;
  address: string;
  isVerified: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isPrimary?: boolean;
}

export interface ConnectWalletDto {
  address: string;
}

export interface VerifyWalletDto {
  address: string;
  signature: string;
}

export interface DbWallet {
  id: string;
  address: string;
  isVerified: boolean;
  isPrimary?: boolean;
}
