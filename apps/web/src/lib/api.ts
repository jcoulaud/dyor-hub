import {
  ActivityPointsConfig,
  AvailableBadge,
  BadgeActivity,
  BadgeFormValues,
  BadgeSummary,
  Badge as BadgeType,
  Comment,
  CreateCommentDto,
  LatestComment,
  LeaderboardEntry,
  LeaderboardResponse,
  NotificationsResponse,
  StreakMilestone,
  StreakMilestonesResponse,
  StreakOverview,
  Token,
  TokenStats,
  TopStreakUsers,
  TwitterUsernameHistoryEntity,
  User,
  UserActivity,
  UserBadge,
  UserPreferences,
  UserRankings,
  UserReputation,
  UserStats,
  UserStreak,
  VoteType,
  WalletResponse,
} from '@dyor-hub/types';

interface PublicWalletInfo {
  address: string;
  isVerified: boolean;
}

interface PriceHistoryItem {
  unixTime: number;
  value: number;
}

interface PriceHistoryResponse {
  items: PriceHistoryItem[];
}

// Use configured API URL for cross-domain requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

// Define additional cache TTLs
// (Removed unused TTL constants)

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
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    this.data = data;
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
// (Removed unused TTL constants)

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

      throw new ApiError(statusCode, message, errorData);
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
      throw new ApiError(500, `Network error: ${error.message}`);
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

      const error = new ApiError(statusCode, message, errorData);
      throw error;
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
      throw new ApiError(500, `Network error: ${error.message}`);
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

  getTokenInfo: async (
    entityId: string,
    entityType: 'comment' | 'vote',
  ): Promise<{ mintAddress: string }> => {
    if (!entityId || !entityType) {
      throw new Error('Missing required parameters: entityId and entityType must be provided');
    }

    try {
      // Ensure we're using the same exact format that the controller expects
      const response = await api<{ mintAddress: string }>(
        `comments/token-info?id=${encodeURIComponent(entityId)}&type=${encodeURIComponent(entityType)}`,
      );
      return response;
    } catch (error) {
      console.error(`Error fetching token info for ${entityType} ${entityId}:`, error);
      throw error;
    }
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
      setCache(cacheKey, data, 5 * 1000);
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
      setCache(cacheKey, data, 5 * 1000);
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
      setCache(cacheKey, data, 5 * 1000);
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
      setCache(cacheKey, data, 5 * 1000);
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
      setCache(cacheKey, data, 5 * 1000);
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
      const data = await api<User>(endpoint);

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
        setCache(cacheKey, data, 5 * 1000);
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
          setCache(cacheKey, data, 5 * 1000);
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
          setCache(cacheKey, data, 5 * 1000);
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
      setCache(cacheKey, data, 5 * 1000);
      return data;
    } catch (error) {
      console.error('[getUserPreferences] Error fetching user preferences:', error);
      return {};
    }
  },

  updateUserPreferences: async (
    preferences: Partial<UserPreferences>,
    currentUsername?: string,
  ): Promise<Partial<UserPreferences>> => {
    try {
      const endpoint = 'users/me/preferences';
      const data = await api<Partial<UserPreferences>>(endpoint, {
        method: 'PATCH',
        body: { preferences: preferences },
      });

      // Update preferences cache for the current user
      const prefsCacheKey = `api:users/me/preferences`;
      const currentPrefs = getCache<Partial<UserPreferences>>(prefsCacheKey) || {};
      setCache(prefsCacheKey, { ...currentPrefs, ...data }, 5 * 1000);

      // Invalidate the main user cache for the current user
      const userCacheKey = `api:users/me`;
      apiCache.delete(userCacheKey);

      // If the visibility preference changed AND we have the username, invalidate public profile cache
      if (preferences.showWalletAddress !== undefined && currentUsername) {
        const publicProfileCacheKey = `api:users/${encodeURIComponent(currentUsername)}`;
        apiCache.delete(publicProfileCacheKey);
        console.log('Invalidated public profile cache:', publicProfileCacheKey);
      }

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

  admin: {
    getLastRegisteredUsers: async (limit: number): Promise<User[]> => {
      try {
        const endpoint = `admin/users/recent?limit=${limit}`;
        const data = await api<User[]>(endpoint);
        return data;
      } catch (error) {
        console.error(`Error fetching last registered users (limit ${limit}):`, error);
        throw error;
      }
    },
    getPaginatedUsers: async (
      page: number = 1,
      limit: number = 20,
      search?: string,
    ): Promise<{ users: User[]; total: number; totalPages: number }> => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search) {
          params.append('search', search);
        }
        const endpoint = `admin/users?${params.toString()}`;
        const data = await api<{ users: User[]; total: number; totalPages: number }>(endpoint);
        return data;
      } catch (error) {
        console.error(`Error fetching paginated users:`, error);
        throw error;
      }
    },
  },
};

export const watchlist = {
  getWatchlistedTokens: async (): Promise<(Token & { addedAt: Date })[]> => {
    try {
      const endpoint = 'watchlist/tokens';
      const data = await api<(Token & { addedAt: Date })[]>(endpoint);
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

      apiCache.delete(`api:tokens/${mintAddress}`);
    } catch (error) {
      console.error('[removeTokenFromWatchlist] Error removing token from watchlist:', error);
      throw error;
    }
  },

  isTokenWatchlisted: async (mintAddress: string): Promise<boolean> => {
    try {
      const endpoint = `watchlist/tokens/${mintAddress}/status`;

      const data = await api<boolean>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error checking token watchlist status for ${mintAddress}:`, error);
      throw error;
    }
  },
};

export const gamification = {
  badges: {
    // Cache keys prefix
    cachePrefix: 'api:gamification/badges',

    async getUserBadges(userId?: string): Promise<UserBadge[]> {
      const endpoint = userId ? `gamification/users/${userId}/badges` : 'gamification/badges';
      const cacheKey = `api:${endpoint}`;

      try {
        // Check cache first
        const cachedData = getCache<UserBadge[]>(cacheKey);
        if (cachedData) return cachedData;

        // Fetch from API
        const data = await api<UserBadge[]>(endpoint);
        // Add 5 second cache duration
        setCache<UserBadge[]>(cacheKey, data, 5 * 1000);
        return data;
      } catch (error) {
        console.error('Error fetching user badges:', error);
        throw error;
      }
    },

    async getAvailableBadges(): Promise<AvailableBadge[]> {
      const endpoint = 'gamification/badges/available';
      const cacheKey = `api:${endpoint}`;

      try {
        // Check cache first
        const cachedData = getCache<AvailableBadge[]>(cacheKey);
        if (cachedData) return cachedData;

        const data = await api<AvailableBadge[]>(endpoint);

        // Add 5 second cache duration
        setCache<AvailableBadge[]>(cacheKey, data, 5 * 1000);
        return data;
      } catch (error) {
        console.error('Error fetching available badges:', error);
        throw error;
      }
    },

    // Function to clear user badges cache
    clearBadgesCache(userId?: string): void {
      const keyPrefixes = userId
        ? [`api:gamification/users/${userId}/badges`]
        : ['api:gamification/badges', 'api:gamification/badges/available'];

      for (const key of apiCache.keys()) {
        if (keyPrefixes.some((prefix) => key.startsWith(prefix))) {
          apiCache.delete(key);
        }
      }
    },

    async getUserBadgeSummary(userId?: string): Promise<BadgeSummary> {
      const endpoint = userId
        ? `gamification/users/${userId}/badges/summary`
        : 'gamification/badges/summary';
      const cacheKey = `api:${endpoint}`;

      try {
        // Check cache first
        const cachedData = getCache<BadgeSummary>(cacheKey);
        if (cachedData) {
          return cachedData;
        }

        const data = await api<BadgeSummary>(endpoint);
        setCache(cacheKey, data, 5 * 1000); // 5 seconds cache
        return data;
      } catch (error) {
        console.error('Error fetching badge summary:', error);
        throw error;
      }
    },
  },

  streaks: {
    async getUserStreak(userId?: string): Promise<UserStreak> {
      const endpoint = userId ? `gamification/users/${userId}/streak` : 'gamification/streak';
      const cacheKey = `api:${endpoint}`;

      try {
        // Check cache first
        const cachedData = getCache<UserStreak>(cacheKey);
        if (cachedData) return cachedData;

        // Fetch from API
        const data = await api<UserStreak>(endpoint);
        setCache<UserStreak>(cacheKey, data, 5 * 1000);
        return data;
      } catch (error) {
        console.error('Error fetching user streak:', error);
        throw error;
      }
    },

    async getMilestones(): Promise<StreakMilestone[]> {
      const endpoint = 'gamification/streaks/milestones';
      const cacheKey = `api:${endpoint}`;

      try {
        // Check cache first
        const cachedData = getCache<StreakMilestonesResponse>(cacheKey);
        if (cachedData) return cachedData.milestones;

        // Fetch from API
        const data = await api<StreakMilestonesResponse>(endpoint);
        setCache<StreakMilestonesResponse>(cacheKey, data, 5 * 1000);
        return data.milestones;
      } catch (error) {
        console.error('Error fetching streak milestones:', error);
        throw error;
      }
    },

    clearStreakCache(userId?: string): void {
      // Clear specific user streak
      if (userId) {
        apiCache.delete(`api:gamification/users/${userId}/streak`);
      }
      // Clear current user streak
      apiCache.delete('api:gamification/streak');
      // Clear milestones cache
      apiCache.delete('api:gamification/streaks/milestones');
    },

    /**
     * Perform a daily check-in to maintain streak
     * This will be called automatically when users visit the site while logged in
     */
    async checkIn(): Promise<{ success: boolean; message: string }> {
      try {
        const response = await api<{ success: boolean; message: string }>('gamification/check-in', {
          method: 'POST',
        });

        // Clear cache to ensure updated streak info is fetched next time
        this.clearStreakCache();

        return response;
      } catch (error) {
        console.error('Error during check-in:', error);
        return { success: false, message: 'Failed to check in' };
      }
    },
  },
};

// Notifications API methods
export const notifications = {
  getNotifications: async (onlyUnread = false) => {
    return api<NotificationsResponse>(`notifications?unreadOnly=${onlyUnread}`);
  },

  getPaginatedNotifications: async (page: number, pageSize: number) => {
    return api<NotificationsResponse>(`notifications?page=${page}&pageSize=${pageSize}`);
  },

  markAsRead: async (id: string) => {
    return api<{ success: boolean }>(`notifications/${id}/read`, {
      method: 'POST',
    });
  },

  markAllAsRead: async () => {
    return api<{ success: boolean }>('notifications/read-all', {
      method: 'POST',
    });
  },

  deleteNotification: async (id: string) => {
    return api<{ success: boolean }>(`notifications/${id}`, {
      method: 'DELETE',
    });
  },

  getPreferences: async () => {
    return api<{ preferences: Record<string, boolean> }>('notifications/preferences');
  },

  updatePreference: async (
    type: string,
    settings: { inApp?: boolean; email?: boolean; telegram?: boolean },
  ) => {
    return api<{ success: boolean }>(`notifications/preferences/${type}`, {
      method: 'POST',
      body: settings,
    });
  },
};

// Leaderboards API methods
export const leaderboards = {
  getLeaderboard: async (category: string, timeframe: string, limit = 10) => {
    return api<LeaderboardEntry[]>(
      `leaderboards?category=${category}&timeframe=${timeframe}&limit=${limit}`,
    );
  },

  getPaginatedLeaderboard: async (category: string, timeframe: string, page = 1, pageSize = 20) => {
    return api<LeaderboardResponse>(
      `leaderboards?category=${category}&timeframe=${timeframe}&page=${page}&pageSize=${pageSize}`,
    );
  },

  getUserPosition: async (category: string, timeframe: string) => {
    return api<{ rank: number; points: number }>(
      `leaderboards/user-position?category=${category}&timeframe=${timeframe}`,
    );
  },

  getUserRanking: async (userId: string) => {
    return api<UserRankings>(`leaderboards/user/${userId}`);
  },

  admin: {
    recalculateLeaderboards: async () => {
      return api<{ success: boolean }>('leaderboards/recalculate', {
        method: 'POST',
      });
    },
  },
};

// Wallets API methods
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

// Export admin-specific APIs directly
export const badges = {
  admin: {
    getAllBadges: async () => {
      return api<BadgeType[]>('admin/badges');
    },
    createBadge: async (badgeData: BadgeFormValues) => {
      return api<BadgeType>('admin/badges', {
        method: 'POST',
        body: badgeData,
      });
    },
    updateBadge: async (badgeId: string, badgeData: BadgeFormValues) => {
      return api<BadgeType>(`admin/badges/${badgeId}`, {
        method: 'PUT',
        body: badgeData,
      });
    },
    deleteBadge: async (badgeId: string) => {
      return api<{ success: boolean }>(`admin/badges/${badgeId}`, {
        method: 'DELETE',
      });
    },
    awardBadgeToUsers: async (badgeId: string, userIds: string[]) => {
      return api<{ success: boolean }>(`admin/badges/${badgeId}/award-bulk`, {
        method: 'POST',
        body: { userIds },
      });
    },
    getRecentBadgeActivity: async (limit = 10) => {
      return api<BadgeActivity[]>(`admin/badges/activity/recent?limit=${limit}`);
    },
  },
};

export const streaks = {
  admin: {
    getStreakOverview: async () => {
      return api<StreakOverview & { milestoneCounts: Record<number, number> }>(
        'admin/streaks/overview',
      );
    },
    getTopStreakUsers: async (limit = 10) => {
      type TopUsersData = {
        topCurrentStreaks: (TopStreakUsers & { id: string; lastActivityDate: Date | null })[];
        topAllTimeStreaks: (TopStreakUsers & { id: string })[];
      };
      return api<TopUsersData>(`admin/streaks/top-users?limit=${limit}`);
    },
  },
};

export const reputation = {
  admin: {
    getActivityPointValues: async () => {
      return api<ActivityPointsConfig>('admin/reputation/points-config');
    },
  },
  getTopUsers: async (limit = 10) => {
    return api<{ users: UserReputation[] }>(`admin/reputation/top-users?limit=${limit}`);
  },
};
