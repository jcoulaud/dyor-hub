import { TokenMinimum } from './token';
import { UserMinimum } from './user';

export enum TokenCallStatus {
  PENDING = 'PENDING',
  VERIFIED_SUCCESS = 'VERIFIED_SUCCESS',
  VERIFIED_FAIL = 'VERIFIED_FAIL',
  ERROR = 'ERROR',
}

export interface CreateTokenCallInput {
  tokenMintAddress: string;
  targetPrice: number;
  targetDate: Date;
  explanation: string;
}

export interface TokenCall {
  id: string;
  userId: string;
  tokenId: string;
  callTimestamp: string;
  referencePrice: number;
  referenceSupply: number | null;
  targetPrice: number;
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
  priceHistoryUrl?: string | null;
}

export interface PaginatedTokenCallsResult {
  items: TokenCall[];
  total: number;
  page: number;
  limit: number;
}

export enum TokenCallSortBy {
  CREATED_AT = 'createdAt',
  CALL_TIMESTAMP = 'callTimestamp',
  TARGET_DATE = 'targetDate',
  REFERENCE_PRICE = 'referencePrice',
  TARGET_PRICE = 'targetPrice',
  MULTIPLIER = 'multiplier', // Note: Calculated field, backend handles this
}
