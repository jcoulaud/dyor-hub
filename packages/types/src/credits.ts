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
