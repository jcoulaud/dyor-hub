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
