import { TokenMinimum } from './token';
import { UserMinimum } from './user';

export enum TokenCallStatus {
  PENDING = 'PENDING',
  VERIFIED_SUCCESS = 'VERIFIED_SUCCESS',
  VERIFIED_FAIL = 'VERIFIED_FAIL',
  ERROR = 'ERROR',
}

export interface CreateTokenCallInput {
  tokenId: string;
  targetPrice: number;
  timeframeDuration: string;
}

export interface TokenCall {
  id: string;
  userId: string;
  tokenId: string;
  callTimestamp: string;
  referencePrice: number;
  targetPrice: number;
  timeframeDuration: string;
  targetDate: string;
  status: TokenCallStatus;
  verificationTimestamp?: string | null;
  peakPriceDuringPeriod?: number | null;
  finalPriceAtTargetDate?: number | null;
  targetHitTimestamp?: string | null;
  timeToHitRatio?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: UserMinimum;
  token?: TokenMinimum;
}

export interface PaginatedTokenCallsResult {
  items: TokenCall[];
  total: number;
  page: number;
  limit: number;
}
