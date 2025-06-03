import { User } from './user';

export enum AuthProvider {
  TWITTER = 'twitter',
  WALLET = 'wallet',
}

export interface AuthMethod {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerId: string;
  isPrimary: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TwitterAuthData {
  twitterId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface WalletAuthData {
  address: string;
  signature: string;
}

// Wallet authentication interfaces
export interface WalletCheckResponse {
  status: 'existing_user' | 'needs_verification' | 'new_wallet' | 'conflict';
  user?: User;
  walletId?: string;
  message?: string;
}

export interface WalletLoginRequest {
  walletAddress: string;
  signature: string;
}

export interface WalletSignupRequest {
  walletAddress: string;
  signature: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  referralCode?: string;
}

export interface WalletAuthResponse {
  success: boolean;
  user: User;
}
