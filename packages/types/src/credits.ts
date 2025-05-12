import type { User } from './user';

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
  user?: User;
  type: CreditTransactionType;
  amount: number;
  solanaTransactionId?: string;
  details?: string;
  createdAt: Date;
}
