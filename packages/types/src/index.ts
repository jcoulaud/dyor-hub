export * from './activity';
export * from './admin';
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
export * from './uploads';
export * from './user';
export * from './user-preferences';
export * from './vote';
export * from './wallet';
export * from './watchlist';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TokenGatedErrorData {
  message?: string;
  currentBalance?: string;
  requiredBalance?: string;
  requiredTokenSymbol?: string;
}
