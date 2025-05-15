export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  solPrice: number;
  isActive: boolean;
}

export enum CreditTransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  solanaTransactionId?: string | null;
  details?: string | null;
  createdAt: Date;
}

export interface CreateCreditPackageDto {
  name: string;
  credits: number;
  solPrice: number;
  isActive?: boolean;
}

export interface UpdateCreditPackageDto {
  name?: string;
  credits?: number;
  solPrice?: number;
  isActive?: boolean;
}

export interface BonusTier {
  minTokenHold: number;
  bonusPercentage: number; // e.g., 0.10 for 10%
  label: string; // e.g., "10% DYORHODLER Bonus"
}
