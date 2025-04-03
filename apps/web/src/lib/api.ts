import type {
  Comment,
  CreateCommentDto,
  LatestComment,
  Token,
  TokenStats,
  TwitterUsernameHistoryEntity,
  User,
  UserActivity,
  UserPreferences,
  UserStats,
  VoteType,
} from '@dyor-hub/types';

// Use configured API URL for cross-domain requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Detect if we're using subdomain (api.domain.com) or path-based (/api) routing
const isApiSubdomain = (() => {
  try {
    const url = new URL(API_BASE_URL);
    return url.hostname.startsWith('api.');
  } catch {
    // Silent fail in production, default to path-based routing
    return false;
  }
})();

// API error with HTTP status code
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

// Simple in-memory cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const apiCache = new Map<string, CacheItem<unknown>>();
const CACHE_TTL = 60 * 1000; // 1 minute TTL

const getCache = <T>(key: string): T | undefined => {
  const cached = apiCache.get(key);
  if (!cached) return undefined;

  if (Date.now() >= cached.expiresAt) {
    apiCache.delete(key);
    return undefined;
  }
  return cached.data as T;
};

const setCache = <T>(key: string, data: T, ttl: number = CACHE_TTL): void => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
};

const api = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  // Format endpoint based on API routing strategy (Subdomain vs Path)
  let apiEndpoint = endpoint;
  if (!isApiSubdomain) {
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`;
  } else {
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
  }
  if (!apiEndpoint.startsWith('/')) {
    apiEndpoint = `/${apiEndpoint}`;
  }
  const url = `${API_BASE_URL}${apiEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && { Origin: window.location.origin }),
        ...options.headers,
      },
      signal: controller.signal,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const statusCode = response.status;
      let message = `HTTP error ${statusCode}`;
      let errorData: { message?: string | string[] } | string | null = null;

      try {
        errorData = await response.json();
        if (errorData && typeof errorData === 'object' && errorData.message) {
          if (typeof errorData.message === 'string') {
            message = errorData.message;
          } else if (Array.isArray(errorData.message)) {
            message = errorData.message.join(', ');
          }
        } else if (typeof errorData === 'string') {
          message = errorData;
        }
      } catch {
        // Keep default message if JSON parsing fails
      }

      if (statusCode === 401 && endpoint === 'auth/profile') {
        message = 'Unauthorized';
      }

      throw new ApiError(statusCode, message);
    }

    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ApiError(0, `Network error: ${error.message}`);
    }

    // Unexpected errors
    throw new ApiError(500, 'An unknown error occurred');
  }
};

// Typed API methods
export const comments = {
  list: async (
    tokenMintAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Comment[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await api<{
      data: Comment[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`comments?tokenMintAddress=${tokenMintAddress}&page=${page}&limit=${limit}`);
    return response;
  },

  get: async (commentId: string): Promise<Comment> => {
    const response = await api<Comment>(`comments/${commentId}`);
    return response;
  },

  latest: async (limit: number = 5): Promise<LatestComment[]> => {
    const response = await api<LatestComment[]>(`comments/latest?limit=${limit}`);
    return response;
  },

  create: async (data: CreateCommentDto): Promise<Comment> => {
    const response = await api<Comment>('comments', { method: 'POST', body: data });
    return response;
  },

  update: async (commentId: string, content: string): Promise<Comment> => {
    const response = await api<Comment>(`comments/${commentId}`, {
      method: 'PUT',
      body: { content },
    });
    return response;
  },

  vote: async (
    commentId: string,
    type: VoteType,
  ): Promise<{ upvotes: number; downvotes: number; userVoteType: VoteType | null }> => {
    const response = await api<{
      upvotes: number;
      downvotes: number;
      userVoteType: VoteType | null;
    }>(`comments/${commentId}/vote`, { method: 'POST', body: { type } });
    return response;
  },

  remove: async (commentId: string): Promise<Comment> => {
    const response = await api<Comment>(`comments/${commentId}/remove`, { method: 'POST' });
    return response;
  },
};

export const auth = {
  getProfile: () => api<AuthResponse>('auth/profile'),
  logout: () => api('auth/logout', { method: 'GET' }),

  getTwitterLoginUrl: async (usePopup = false): Promise<string> => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const response = await api<{ url: string }>(
      `auth/twitter-login-url?return_to=${encodeURIComponent(currentUrl)}&use_popup=${usePopup}`,
    );
    return response.url;
  },

  twitterLogin: async (): Promise<void> => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const response = await api<{ url: string }>(
      `auth/twitter-login-url?return_to=${encodeURIComponent(currentUrl)}`,
    );
    if (typeof window !== 'undefined') {
      window.location.href = response.url;
    }
  },
};

interface PriceHistoryItem {
  unixTime: number;
  value: number;
}

interface PriceHistoryResponse {
  items: PriceHistoryItem[];
}

export const tokens = {
  list: async (): Promise<Token[]> => {
    try {
      const endpoint = 'tokens';
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<Token[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<Token[]>(endpoint);

      // Update cache
      setCache(cacheKey, data);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getByMintAddress: async (mintAddress: string): Promise<Token> => {
    try {
      const endpoint = `tokens/${mintAddress}`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<Token>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<Token>(endpoint);

      // Update cache
      setCache(cacheKey, data);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getTokenStats: async (mintAddress: string): Promise<TokenStats> => {
    try {
      const endpoint = `tokens/${mintAddress}/stats`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<TokenStats>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<TokenStats>(endpoint);

      // Update cache
      setCache(cacheKey, data);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getTwitterHistory: async (mintAddress: string): Promise<TwitterUsernameHistoryEntity | null> => {
    try {
      const endpoint = `tokens/${mintAddress}/twitter-history`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<TwitterUsernameHistoryEntity>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<TwitterUsernameHistoryEntity>(endpoint);

      // Update cache
      setCache(cacheKey, data);

      return data;
    } catch (error) {
      throw error;
    }
  },

  refreshToken: (mintAddress: string) => {
    // Clear cache for this token
    const tokenCacheKey = `api:tokens/${mintAddress}`;
    const statsCacheKey = `api:tokens/${mintAddress}/stats`;
    const twitterHistoryCacheKey = `api:tokens/${mintAddress}/twitter-history`;
    apiCache.delete(tokenCacheKey);
    apiCache.delete(statsCacheKey);
    apiCache.delete(twitterHistoryCacheKey);

    return api<void>(`tokens/${mintAddress}/refresh`, { method: 'POST' });
  },

  getTokenPriceHistory: async (
    mintAddress: string,
    signal?: AbortSignal,
  ): Promise<PriceHistoryResponse> => {
    try {
      const endpoint = `tokens/${mintAddress}/price-history`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first - but with a shorter TTL for price data
      const cachedData = getCache<PriceHistoryResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<PriceHistoryResponse>(endpoint, { signal });

      // Update cache with 5 minutes TTL
      setCache(cacheKey, data, 5 * 60 * 1000);

      return data;
    } catch (error) {
      throw error;
    }
  },
};

export const users = {
  getByUsername: async (username: string): Promise<User> => {
    try {
      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<User>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<User>(endpoint);

      // Update cache
      setCache(cacheKey, data);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getUserPrimaryWallet: async (username: string): Promise<WalletResponse | null> => {
    try {
      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}/primary-wallet`;

      const cacheKey = `api:${endpoint}`;

      apiCache.delete(cacheKey);

      const data = await api<WalletResponse | null>(endpoint);

      if (data) {
        setCache(cacheKey, data, 60 * 1000); // 1 minute cache
      }

      return data;
    } catch (error) {
      console.error('[getUserPrimaryWallet] Error fetching primary wallet:', error);
      return null;
    }
  },

  getUserStats: async (username: string): Promise<UserStats> => {
    try {
      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}/stats`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first with shorter TTL for stats
      const cachedData = getCache<UserStats>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<UserStats>(endpoint);

      // Update cache with shorter TTL (30 seconds)
      setCache(cacheKey, data, 30 * 1000);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getUserActivity: async (
    username: string,
    page: number = 1,
    limit: number = 10,
    type?: 'all' | 'comments' | 'replies' | 'upvotes' | 'downvotes',
    sort: 'recent' | 'popular' = 'recent',
  ): Promise<{
    data: UserActivity[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (sort) params.append('sort', sort);
      if (type && type !== 'all') params.append('type', type);

      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}/activity?${params.toString()}`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first with shorter TTL
      const cachedData = getCache<{
        data: UserActivity[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<{
        data: UserActivity[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(endpoint);

      // Update cache with shorter TTL (30 seconds)
      setCache(cacheKey, data, 30 * 1000);

      return data;
    } catch (error) {
      throw error;
    }
  },

  getUserPreferences: async (): Promise<Partial<UserPreferences>> => {
    try {
      const endpoint = 'users/me/preferences';
      const cacheKey = `api:${endpoint}`;

      const cachedData = getCache<Partial<UserPreferences>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await api<Partial<UserPreferences>>(endpoint);
      setCache(cacheKey, data, 30 * 1000);
      return data;
    } catch (error) {
      console.error('[getUserPreferences] Error fetching user preferences:', error);
      return {};
    }
  },

  updateUserPreferences: async (
    preferences: Partial<UserPreferences>,
  ): Promise<Partial<UserPreferences>> => {
    try {
      const endpoint = 'users/me/preferences';
      const data = await api<Partial<UserPreferences>>(endpoint, {
        method: 'PATCH',
        body: { preferences: preferences },
      });

      const cacheKey = `api:users/me/preferences`;
      const currentPrefs = getCache<Partial<UserPreferences>>(cacheKey) || {};
      setCache(cacheKey, { ...currentPrefs, ...data });
      return data;
    } catch (error) {
      console.error('[updateUserPreferences] Error updating user preferences:', error);
      throw error;
    }
  },

  updateWalletAddress: async (walletAddress: string): Promise<User> => {
    const response = await api<User>('users/wallet', {
      method: 'PUT',
      body: { walletAddress },
    });
    return response;
  },
};

export const watchlist = {
  getWatchlistedTokens: async (): Promise<(Token & { addedAt: Date })[]> => {
    try {
      const endpoint = 'watchlist/tokens';
      const cacheKey = `api:${endpoint}`;

      // Check cache first with short TTL
      const cachedData = getCache<(Token & { addedAt: Date })[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const data = await api<(Token & { addedAt: Date })[]>(endpoint);

      // Update cache with short TTL (30 seconds)
      setCache(cacheKey, data, 30 * 1000);

      return data;
    } catch (error) {
      console.error('[getWatchlistedTokens] Error fetching watchlisted tokens:', error);
      return [];
    }
  },

  addTokenToWatchlist: async (mintAddress: string): Promise<{ success: boolean }> => {
    try {
      const endpoint = `watchlist/tokens/${mintAddress}`;
      const data = await api<{ success: boolean }>(endpoint, {
        method: 'POST',
      });

      // Invalidate cache for watchlist
      apiCache.delete('api:watchlist/tokens');

      // Also invalidate the specific token cache since watchlist status changed
      apiCache.delete(`api:tokens/${mintAddress}`);

      return data;
    } catch (error) {
      console.error('[addTokenToWatchlist] Error adding token to watchlist:', error);
      throw error;
    }
  },

  removeTokenFromWatchlist: async (mintAddress: string): Promise<void> => {
    try {
      const endpoint = `watchlist/tokens/${mintAddress}`;
      await api<void>(endpoint, {
        method: 'DELETE',
      });

      // Invalidate cache for watchlist
      apiCache.delete('api:watchlist/tokens');

      // Also invalidate the specific token cache since watchlist status changed
      apiCache.delete(`api:tokens/${mintAddress}`);
    } catch (error) {
      console.error('[removeTokenFromWatchlist] Error removing token from watchlist:', error);
      throw error;
    }
  },

  isTokenWatchlisted: async (mintAddress: string): Promise<boolean> => {
    try {
      const endpoint = `watchlist/tokens/${mintAddress}/status`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first with very short TTL
      const cachedData = getCache<{ isWatchlisted: boolean }>(cacheKey);
      if (cachedData) {
        return cachedData.isWatchlisted;
      }

      // Fetch fresh data
      const data = await api<{ isWatchlisted: boolean }>(endpoint);

      // Update cache with very short TTL (10 seconds)
      setCache(cacheKey, data, 10 * 1000);

      return data.isWatchlisted;
    } catch (error) {
      console.error('[isTokenWatchlisted] Error checking token watchlist status:', error);
      return false;
    }
  },
};

interface WalletResponse {
  id: string;
  address: string;
  isVerified: boolean;
  isPrimary: boolean;
}

interface PublicWalletInfo {
  address: string;
  isVerified: boolean;
}

export const wallets = {
  connect: async (address: string) => {
    return api<WalletResponse>('wallets/connect', {
      method: 'POST',
      body: { address },
    });
  },

  generateNonce: async (address: string) => {
    return api<{ nonce: string; expiresAt: number }>('wallets/generate-nonce', {
      method: 'POST',
      body: { address },
    });
  },

  verify: async (address: string, signature: string) => {
    return api<WalletResponse>('wallets/verify', {
      method: 'POST',
      body: { address, signature },
    });
  },

  list: async () => {
    return api<WalletResponse[]>('wallets');
  },

  getPublicInfo: async (userId: string): Promise<PublicWalletInfo | null> => {
    const result = await api<PublicWalletInfo | null>(`public-wallets/${userId}`);
    return result;
  },

  setPrimary: async (id: string) => {
    return api<{ success: boolean; isPrimary: boolean }>(`wallets/${id}/primary`, {
      method: 'POST',
    });
  },

  delete: async (id: string) => {
    return api<{ success: boolean; message: string }>(`wallets/${id}`, {
      method: 'DELETE',
    });
  },
};
