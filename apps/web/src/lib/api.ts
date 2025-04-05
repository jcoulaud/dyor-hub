import type {
  ActivityPointsConfig,
  Badge,
  Comment,
  CreateBadgeRequest,
  CreateCommentDto,
  LatestComment,
  LeaderboardCategory,
  LeaderboardResponse,
  LeaderboardTimeframe,
  Token,
  TokenStats,
  TwitterUsernameHistoryEntity,
  UpdateBadgeRequest,
  User,
  UserActivity,
  UserPreferences,
  UserRankEntry,
  UserReputation,
  UserReputationTrends,
  UserStats,
  VoteType,
  WalletResponse,
} from '@dyor-hub/types';

// Use configured API URL for cross-domain requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Define additional cache TTLs
const TOKEN_CACHE_TTL = 60 * 1000; // 1 minute for token data
const TOKEN_STATS_CACHE_TTL = 60 * 1000; // 1 minute for token stats
const TOKEN_PRICE_HISTORY_CACHE_TTL = 60 * 1000; // 1 minute for price history
const TOKEN_LIST_CACHE_TTL = 60 * 1000; // 1 minute for token lists

type TokenWithWatchlistStatus = Token & { isWatchlisted?: boolean };
type TokenListItem = Token;

const isApiSubdomain = (() => {
  try {
    const url = new URL(API_BASE_URL);
    return url.hostname.startsWith('api.');
  } catch {
    return false;
  }
})();

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
const pendingRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL = 60 * 1000; // 1 minute default TTL
const PROFILE_CACHE_TTL = 60 * 1000; // 1 minute for profiles
const STATS_CACHE_TTL = 60 * 1000; // 1 minute for stats
const ACTIVITY_CACHE_TTL = 60 * 1000; // 1 minute for activity

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

// Helper function to determine if an endpoint is for public user data
const isPublicUserRoute = (endpoint: string): boolean => {
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  return (
    normalizedEndpoint.startsWith('users/') && // User profiles
    !normalizedEndpoint.startsWith('users/me/') // Exclude my profile
  );
};

// Helper function to determine if an endpoint is for public token data
const isPublicTokenRoute = (endpoint: string): boolean => {
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  return normalizedEndpoint.startsWith('tokens/');
};

// Handle public endpoints separately with a no-auth approach
const publicApi = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
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
      credentials: 'omit',
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

      if (statusCode === 401 || statusCode === 403) {
        console.warn(`Authentication error (${statusCode}) accessing public endpoint: ${endpoint}`);
        throw new ApiError(statusCode, 'Authentication required');
      }

      let message = `HTTP error ${statusCode}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && errorData.message) {
          message = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message;
        }
      } catch {
        // Keep default message if JSON parsing fails
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

const api = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  if (isPublicUserRoute(endpoint) || isPublicTokenRoute(endpoint)) {
    return publicApi<T>(endpoint, options);
  }

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
    sortBy: string = 'best',
  ): Promise<{
    data: Comment[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await api<{
      data: Comment[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(
      `comments?tokenMintAddress=${tokenMintAddress}&page=${page}&limit=${limit}&sortBy=${sortBy}`,
    );
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

  getThread: async (
    commentId: string,
  ): Promise<{
    rootComment: Comment;
    comments: Comment[];
    focusedCommentId: string;
  }> => {
    const response = await api<{
      rootComment: Comment;
      comments: Comment[];
      focusedCommentId: string;
    }>(`comments/thread/${commentId}`);
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
  time: string;
  price: number;
}

type PriceHistoryResponse = PriceHistoryItem[];

export const tokens = {
  list: async (
    page: number = 1,
    limit: number = 10,
    sortBy: string = '',
    filter: string = '',
  ): Promise<TokenListItem[]> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (sortBy) params.append('sortBy', sortBy);
      if (filter) params.append('filter', filter);

      const endpoint = `tokens?${params.toString()}`;
      const cacheKey = `api:${endpoint}`;

      // Short cache for token list
      const cachedData = getCache<TokenListItem[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await api<TokenListItem[]>(endpoint);
      setCache(cacheKey, data, TOKEN_LIST_CACHE_TTL);
      return data;
    } catch (error) {
      console.error(`Error fetching token list:`, error);
      throw error;
    }
  },

  getByMintAddress: async (mintAddress: string): Promise<TokenWithWatchlistStatus> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<TokenWithWatchlistStatus>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Create a new request
      const data = await api<TokenWithWatchlistStatus>(endpoint);
      setCache(cacheKey, data, TOKEN_CACHE_TTL);
      return data;
    } catch (error) {
      console.error(`Error fetching token by mint address ${mintAddress}:`, error);
      throw error;
    }
  },

  getTokenStats: async (mintAddress: string): Promise<TokenStats> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/stats`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<TokenStats>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Create a new request
      const data = await api<TokenStats>(endpoint);
      setCache(cacheKey, data, TOKEN_STATS_CACHE_TTL);
      return data;
    } catch (error) {
      console.error(`Error fetching token stats for ${mintAddress}:`, error);
      throw error;
    }
  },

  getTwitterHistory: async (mintAddress: string): Promise<TwitterUsernameHistoryEntity | null> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/twitter-history`;
      const cacheKey = `api:${endpoint}`;

      const cachedData = getCache<TwitterUsernameHistoryEntity>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await api<TwitterUsernameHistoryEntity>(endpoint);
      setCache(cacheKey, data, TOKEN_STATS_CACHE_TTL);
      return data;
    } catch (error) {
      console.error(`Error fetching token twitter history for ${mintAddress}:`, error);
      throw error;
    }
  },

  getTokenPriceHistory: async (mintAddress: string): Promise<PriceHistoryResponse> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/price-history`;
      const cacheKey = `api:${endpoint}`;

      const cachedData = getCache<PriceHistoryResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await api<PriceHistoryResponse>(endpoint);
      setCache(cacheKey, data, TOKEN_PRICE_HISTORY_CACHE_TTL);
      return data;
    } catch (error) {
      console.error(`Error fetching token price history for ${mintAddress}:`, error);
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

      // Fetch fresh data using api function
      const data = await api<User>(endpoint);

      // Update cache
      setCache(cacheKey, data, PROFILE_CACHE_TTL);

      return data;
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw error;
    }
  },

  getUserPrimaryWallet: async (username: string): Promise<WalletResponse | null> => {
    try {
      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}/primary-wallet`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first
      const cachedData = getCache<WalletResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await api<WalletResponse | null>(endpoint);

      if (data) {
        setCache(cacheKey, data, 60 * 1000); // 1 minute cache
      }

      return data;
    } catch (error) {
      console.error(`Error fetching primary wallet for user ${username}:`, error);
      throw error;
    }
  },

  getUserStats: async (username: string): Promise<UserStats> => {
    try {
      const sanitizedUsername = encodeURIComponent(username);
      const endpoint = `users/${sanitizedUsername}/stats`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first with appropriate TTL for stats
      const cachedData = getCache<UserStats>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Implement request deduplication - if there's already a request in flight, wait for it
      const pendingRequest = pendingRequests.get(cacheKey) as Promise<UserStats> | undefined;
      if (pendingRequest) {
        return pendingRequest;
      }

      // Create a new request and store it
      const requestPromise = api<UserStats>(endpoint)
        .then((data) => {
          // Update cache with appropriate TTL
          setCache(cacheKey, data, STATS_CACHE_TTL);
          // Remove from pending requests when done
          pendingRequests.delete(cacheKey);
          return data;
        })
        .catch((error) => {
          // Remove from pending requests on error too
          pendingRequests.delete(cacheKey);
          throw error;
        });

      // Store the pending request
      pendingRequests.set(cacheKey, requestPromise);

      // Wait for the result
      return requestPromise;
    } catch (error) {
      console.error(`Error fetching stats for user ${username}:`, error);
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

      // Check cache first with appropriate TTL
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

      const pendingRequest = pendingRequests.get(cacheKey) as
        | Promise<{
            data: UserActivity[];
            meta: {
              total: number;
              page: number;
              limit: number;
              totalPages: number;
            };
          }>
        | undefined;

      if (pendingRequest) {
        return pendingRequest;
      }

      const requestPromise = api<{
        data: UserActivity[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(endpoint)
        .then((data) => {
          setCache(cacheKey, data, ACTIVITY_CACHE_TTL);
          pendingRequests.delete(cacheKey);
          return data;
        })
        .catch((error) => {
          pendingRequests.delete(cacheKey);
          throw error;
        });

      pendingRequests.set(cacheKey, requestPromise);

      return requestPromise;
    } catch (error) {
      console.error(`Error fetching activity for user ${username}:`, error);
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

export const badges = {
  async getAllBadges(): Promise<Badge[]> {
    const cacheKey = 'badges:all';
    const cached = getCache<Badge[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await api<Badge[]>('gamification/badges');
      setCache(cacheKey, data, 5 * 60 * 1000); // 5 minutes cache
      return data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  },

  async getBadge(id: string): Promise<Badge> {
    const cacheKey = `badge:${id}`;
    const cached = getCache<Badge>(cacheKey);
    if (cached) return cached;

    try {
      const data = await api<Badge>(`gamification/badges/${id}`);
      setCache(cacheKey, data, 5 * 60 * 1000); // 5 minutes cache
      return data;
    } catch (error) {
      console.error(`Error fetching badge ${id}:`, error);
      throw error;
    }
  },

  // Admin-only API functions
  admin: {
    async getAllBadges(): Promise<Badge[]> {
      try {
        return await api<Badge[]>('admin/badges');
      } catch (error) {
        console.error('Error fetching badges as admin:', error);
        throw error;
      }
    },

    async getBadge(id: string): Promise<Badge> {
      try {
        return await api<Badge>(`admin/badges/${id}`);
      } catch (error) {
        console.error(`Error fetching badge ${id} as admin:`, error);
        throw error;
      }
    },

    async getRecentBadgeActivity(limit: number = 10): Promise<
      Array<{
        id: string;
        userId: string;
        badgeId: string;
        earnedAt: string;
        user: {
          id: string;
          username: string;
          displayName: string;
        };
        badge: Badge;
      }>
    > {
      try {
        return await api<
          Array<{
            id: string;
            userId: string;
            badgeId: string;
            earnedAt: string;
            user: {
              id: string;
              username: string;
              displayName: string;
            };
            badge: Badge;
          }>
        >(`admin/badges/activity/recent?limit=${limit}`);
      } catch (error) {
        console.error('Error fetching recent badge activity:', error);
        throw error;
      }
    },

    async createBadge(badge: CreateBadgeRequest): Promise<Badge> {
      try {
        const result = await api<Badge>('admin/badges', {
          method: 'POST',
          body: badge,
        });

        // Invalidate badges cache
        apiCache.delete('badges:all');
        return result;
      } catch (error) {
        console.error('Error creating badge:', error);
        throw error;
      }
    },

    async updateBadge(id: string, badge: UpdateBadgeRequest): Promise<Badge> {
      try {
        const result = await api<Badge>(`admin/badges/${id}`, {
          method: 'PUT',
          body: badge,
        });

        // Invalidate caches
        apiCache.delete('badges:all');
        apiCache.delete(`badge:${id}`);
        return result;
      } catch (error) {
        console.error(`Error updating badge ${id}:`, error);
        throw error;
      }
    },

    async deleteBadge(id: string): Promise<boolean> {
      try {
        await api<void>(`admin/badges/${id}`, {
          method: 'DELETE',
        });

        // Invalidate caches
        apiCache.delete('badges:all');
        apiCache.delete(`badge:${id}`);
        return true;
      } catch (error) {
        console.error(`Error deleting badge ${id}:`, error);
        throw error;
      }
    },

    async getBadgeStats(id: string): Promise<{
      badge: Badge;
      awardCount: number;
      recentActivity: Array<{
        id: string;
        userId: string;
        badgeId: string;
        earnedAt: string;
        user: {
          id: string;
          username: string;
          displayName: string;
        };
      }>;
    }> {
      try {
        return await api<{
          badge: Badge;
          awardCount: number;
          recentActivity: Array<{
            id: string;
            userId: string;
            badgeId: string;
            earnedAt: string;
            user: {
              id: string;
              username: string;
              displayName: string;
            };
          }>;
        }>(`admin/badges/${id}/stats`);
      } catch (error) {
        console.error(`Error fetching badge stats for ${id}:`, error);
        throw error;
      }
    },

    async awardBadgeToUsers(
      id: string,
      userIds: string[],
    ): Promise<{
      success: Array<{
        id: string;
        userId: string;
        badgeId: string;
        earnedAt: string;
      }>;
      failed: Array<{ userId: string; reason: string }>;
    }> {
      try {
        return await api<{
          success: Array<{
            id: string;
            userId: string;
            badgeId: string;
            earnedAt: string;
          }>;
          failed: Array<{ userId: string; reason: string }>;
        }>(`admin/badges/${id}/award-bulk`, {
          method: 'POST',
          body: { userIds },
        });
      } catch (error) {
        console.error(`Error awarding badge ${id} to users:`, error);
        throw error;
      }
    },
  },
};

export interface StreakOverview {
  activeStreaksCount: number;
  streaksAtRiskCount: number;
  milestoneCounts: Record<number, number>;
}

export interface StreakUser {
  id: string;
  userId: string;
  username: string;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: Date | null;
}

export interface TopStreakUsers {
  topCurrentStreaks: StreakUser[];
  topAllTimeStreaks: StreakUser[];
}

export const streaks = {
  admin: {
    async getStreakOverview(): Promise<StreakOverview> {
      try {
        return await api<StreakOverview>('admin/streaks/overview');
      } catch (error) {
        console.error('Error fetching streak overview:', error);
        throw error;
      }
    },

    async getTopStreakUsers(limit: number = 10): Promise<TopStreakUsers> {
      try {
        return await api<TopStreakUsers>(`admin/streaks/top-users?limit=${limit}`);
      } catch (error) {
        console.error('Error fetching top streak users:', error);
        throw error;
      }
    },
  },
};

interface EnhancedUserReputation {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  totalPoints: number;
  weeklyPoints: number;
}

interface PaginatedLeaderboardResponse {
  users: EnhancedUserReputation[];
  timestamp: Date;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export const leaderboards = {
  getLeaderboard: async (
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
    limit: number = 10,
  ): Promise<LeaderboardResponse> => {
    try {
      return await api<LeaderboardResponse>(
        `leaderboards?category=${category}&timeframe=${timeframe}&limit=${limit}`,
      );
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },

  getPaginatedLeaderboard: async (
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedLeaderboardResponse> => {
    try {
      return await api<PaginatedLeaderboardResponse>(
        `leaderboards?category=${category}&timeframe=${timeframe}&page=${page}&pageSize=${pageSize}`,
      );
    } catch (error) {
      console.error('Error fetching paginated leaderboard:', error);
      throw error;
    }
  },

  getUserPosition: async (
    category: LeaderboardCategory,
    timeframe: LeaderboardTimeframe,
  ): Promise<{ rank: number; points: number }> => {
    try {
      return await api<{ rank: number; points: number }>(
        `leaderboards/user-position?category=${category}&timeframe=${timeframe}`,
      );
    } catch (error) {
      console.error('Error fetching user position:', error);
      throw error;
    }
  },

  getCurrentUserRanks: async (): Promise<UserRankEntry[]> => {
    try {
      return await api<UserRankEntry[]>('leaderboards/user');
    } catch (error) {
      console.error('Error fetching current user ranks:', error);
      throw error;
    }
  },

  getUserRanks: async (userId: string): Promise<UserRankEntry[]> => {
    try {
      return await api<UserRankEntry[]>(`leaderboards/user/${userId}`);
    } catch (error) {
      console.error('Error fetching user ranks:', error);
      throw error;
    }
  },

  admin: {
    async recalculateLeaderboards(): Promise<{ message: string }> {
      try {
        return await api<{ message: string }>('leaderboards/recalculate', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error recalculating leaderboards:', error);
        throw error;
      }
    },
  },
};

export const reputation = {
  getUserReputationTrends: async (userId: string): Promise<UserReputationTrends> => {
    const cacheKey = `reputation_trends_${userId}`;
    const cached = getCache<UserReputationTrends>(cacheKey);
    if (cached) return cached;

    try {
      const data = await api<UserReputationTrends>(`reputation/user/${userId}`);
      setCache(cacheKey, data, PROFILE_CACHE_TTL);
      return data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError(404, 'Reputation data not found');
      }
      throw error;
    }
  },

  getTopUsers: async (
    limit: number = 10,
  ): Promise<{ users: UserReputation[]; lastUpdated: Date }> => {
    const cacheKey = `reputation_top_users_${limit}`;
    const cached = getCache<{ users: UserReputation[]; lastUpdated: Date }>(cacheKey);
    if (cached) return cached;

    try {
      const data = await api<{ users: UserReputation[]; lastUpdated: Date }>(
        `reputation/leaderboard?limit=${limit}`,
      );
      setCache(cacheKey, data, CACHE_TTL);
      return data;
    } catch (error) {
      console.error('Failed to get top users by reputation:', error);
      throw error;
    }
  },

  admin: {
    getActivityPointValues: async (): Promise<ActivityPointsConfig> => {
      const cacheKey = 'reputation_point_values';
      const cached = getCache<ActivityPointsConfig>(cacheKey);
      if (cached) return cached;

      try {
        const data = await api<ActivityPointsConfig>('admin/reputation/activities/points');
        setCache(cacheKey, data, CACHE_TTL);
        return data;
      } catch (error) {
        console.error('Failed to get activity point values:', error);
        throw error;
      }
    },

    getTopUsers: async (
      limit: number = 10,
    ): Promise<{ users: UserReputation[]; timestamp: Date }> => {
      const cacheKey = `reputation_admin_top_users_${limit}`;
      const cached = getCache<{ users: UserReputation[]; timestamp: Date }>(cacheKey);
      if (cached) return cached;

      try {
        const data = await api<{ users: UserReputation[]; timestamp: Date }>(
          `admin/reputation/top-users?limit=${limit}`,
        );
        setCache(cacheKey, data, CACHE_TTL);
        return data;
      } catch (error) {
        console.error('Failed to get top users as admin:', error);
        throw error;
      }
    },
  },
};

export const admin = {
  // ... existing admin methods ...

  recalculateLeaderboards: async (): Promise<{ message: string }> => {
    return api<{ message: string }>('leaderboards/recalculate', {
      method: 'POST',
    });
  },
};
