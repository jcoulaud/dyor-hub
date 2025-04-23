export * from './activity';
export * from './admin';
export * from './badge';
export * from './comment';
export * from './notification';
export * from './reputation';
export * from './streak';
export * from './token';
export * from './token-call';
export * from './user';
export * from './user-preferences';
export * from './vote';
export * from './wallet';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
