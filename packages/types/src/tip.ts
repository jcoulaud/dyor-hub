import { PaginatedResult } from '.'; // Import the generic PaginatedResult

export enum TipContentType {
  COMMENT = 'comment',
  PROFILE = 'profile',
  CALL = 'call',
}

// ---- DTOs for Frontend API lib ----

export interface GetTippingEligibilityResponseDto {
  isEligible: boolean;
  recipientAddress: string | null;
}

export interface RecordTipRequestDto {
  recipientUserId: string;
  amount: number; // Amount in base units
  transactionSignature: string;
  contentType: TipContentType;
  contentId?: string;
}

export interface TipRecordResponse {
  id: string;
}

export interface Tip {
  id: string;
  userId: string;
  type: 'Received' | 'Given';
  senderDisplayName?: string;
  senderUsername?: string;
  recipientDisplayName?: string;
  recipientUsername?: string;
  amount: number;
  timestamp: Date;
  transactionHash?: string;
  context?: string;
  tokenId?: string;
}

export type PaginatedTipsResponse = PaginatedResult<Tip>;

export interface TipPaginationQuery {
  page?: number;
  limit?: number;
}

export interface TipTransaction {
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  timestamp: number;
  blockNumber: number;
  chainId: number;
}

export interface CreateTipDto {
  contentType: TipContentType;
  contentId: string;
  amount: number;
  chainId: number;
  senderAddress: string;
  recipientAddress: string;
  transaction: TipTransaction;
}

export interface TipDetails extends CreateTipDto {
  id: string;
}
