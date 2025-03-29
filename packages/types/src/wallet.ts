export interface WalletResponse {
  id: string;
  address: string;
  isVerified: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectWalletDto {
  address: string;
}

export interface VerifyWalletDto {
  address: string;
  signature: string;
}
