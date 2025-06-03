export * from './activity';
export * from './admin';
export * from './auth';
export * from './badge';
export * from './comment';
export * from './credits';
export * from './giphy';
export * from './notification';
export * from './referral';
export * from './reputation';
export * from './streak';
export * from './tip';
export * from './token';
export * from './token-analysis';
export * from './token-call';
export * from './twitter';
export * from './uploads';
export * from './user';
export * from './user-preferences';
export * from './vote';
export * from './wallet';
export * from './watchlist';

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface TokenGatedErrorData {
  message?: string;
  currentBalance?: string;
  requiredBalance?: string;
  requiredTokenSymbol?: string;
  isTokenGated?: boolean;
  minRequired?: number | string;
  currentAmount?: number | string;
  requiredCredits?: number;
}
