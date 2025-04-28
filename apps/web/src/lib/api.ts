import {
  ActivityPointsConfig,
  AvailableBadge,
  BadgeActivity,
  BadgeFormValues,
  BadgeSummary,
  Badge as BadgeType,
  Comment,
  CreateCommentDto,
  CreateTokenCallInput,
  FeedActivity,
  LeaderboardEntry,
  LeaderboardResponse,
  NotificationPreference,
  NotificationsResponse,
  PaginatedHotTokensResult,
  PaginatedLatestCommentsResponse,
  PaginatedResult,
  PaginatedTokenCallsResult,
  PaginatedTokensResponse,
  ProcessedBundleData,
  Referral,
  ReferralLeaderboardEntry,
  SentimentType,
  StreakMilestone,
  StreakMilestonesResponse,
  StreakOverview,
  Token,
  TokenCall,
  TokenCallStatus,
  TokenSentimentStats,
  TokenStats,
  TopStreakUsers,
  TwitterUsernameHistoryEntity,
  User,
  UserActivity,
  UserBadge,
  UserFollows,
  UserPreferences,
  UserRankings,
  UserReputation,
  UserStats,
  UserStreak,
  VoteType,
  WalletResponse,
  WatchlistFolder,
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
// type TokenListItem = Token; // Removed unused type alias

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

  // These endpoints should never be treated as public:
  // 1. Follow-related endpoints require authentication
  // 2. User's own profile endpoints require authentication
  if (
    normalizedEndpoint.includes('/follow') ||
    normalizedEndpoint === 'users/follow-status' ||
    normalizedEndpoint.startsWith('users/me/')
  ) {
    return false;
  }

  // Only return true for public user profile endpoints
  return (
    normalizedEndpoint.startsWith('users/') && // User profiles
    normalizedEndpoint !== 'users' // Assuming GET /users is not public
  );
};

// Helper function to determine if an endpoint is for public token data
const isPublicTokenRoute = (endpoint: string): boolean => {
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  return (
    normalizedEndpoint.startsWith('tokens/') &&
    normalizedEndpoint !== 'tokens' &&
    normalizedEndpoint !== 'tokens/hot'
  );
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

    const responseClone = response.clone();
    const responseText = await responseClone.text();

    if (responseText === '') {
      return null as T;
    }

    try {
      return await response.json();
    } catch (jsonError) {
      console.error(`API JSON Parse Error for endpoint ${endpoint}:`, jsonError);
      throw new ApiError(500, 'Invalid JSON response from server');
    }
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
  const method = options.method?.toUpperCase() || 'GET';
  const requiresAuth =
    method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';

  // Check for specific authenticated actions OR paths that always need auth context
  const isSentimentEndpoint = endpoint.includes('/sentiment');
  const isWatchlistMutation = endpoint.startsWith('watchlist/tokens/') && requiresAuth;

  // Determine if this specific path should use publicApi
  const usePublicApi =
    !isSentimentEndpoint &&
    !isWatchlistMutation &&
    (isPublicUserRoute(endpoint) ||
      isPublicTokenRoute(endpoint) ||
      // Explicitly allow specific public non-token/user routes like tokens/hot or base tokens list
      endpoint === 'tokens/hot' ||
      endpoint.startsWith('tokens/hot?') ||
      endpoint === 'tokens' ||
      endpoint.startsWith('tokens?') ||
      endpoint === 'comments/global' ||
      endpoint.startsWith('comments/global?'));
  // Add other specific public routes here

  if (usePublicApi) {
    return publicApi<T>(endpoint, options);
  }

  // Otherwise, proceed with the standard authenticated API call logic below

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

    const responseClone = response.clone();
    const responseText = await responseClone.text();

    if (responseText === '') {
      return null as T;
    }

    try {
      return await response.json();
    } catch (jsonError) {
      console.error(`API JSON Parse Error for endpoint ${endpoint}:`, jsonError);
      throw new ApiError(500, 'Invalid JSON response from server');
    }
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

interface TwitterLoginUrlOptions {
  usePopup?: boolean;
  referralCode?: string | null;
  returnTo?: string;
}

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

  listGlobal: async (
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedLatestCommentsResponse> => {
    const response = await api<PaginatedLatestCommentsResponse>(
      `comments/global?page=${page}&limit=${limit}`,
    );
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

  getTwitterLoginUrl: async (options?: TwitterLoginUrlOptions): Promise<string> => {
    const params = new URLSearchParams();

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const returnTo = options?.returnTo || currentUrl;
    if (returnTo) {
      params.set('return_to', returnTo);
    }

    if (options?.usePopup !== undefined) {
      params.set('use_popup', String(options.usePopup));
    }
    if (options?.referralCode) {
      params.set('referralCode', options.referralCode);
    }

    const response = await api<{ url: string }>(`auth/twitter-login-url?${params.toString()}`);
    return response.url;
  },

  twitterLogin: async (): Promise<void> => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const loginUrl = await auth.getTwitterLoginUrl({ returnTo: currentUrl });
    if (typeof window !== 'undefined') {
      window.location.href = loginUrl;
    }
  },
};

export const tokens = {
  list: async (
    page: number = 1,
    limit: number = 10,
    sortBy: string = '',
  ): Promise<PaginatedTokensResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (sortBy) params.append('sortBy', sortBy);

      const endpoint = `tokens?${params.toString()}`;
      apiCache.delete(`api:${endpoint}`);

      const data = await api<PaginatedTokensResponse>(endpoint);
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

  getTokenSentiments: async (mintAddress: string): Promise<TokenSentimentStats> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/sentiment`;
      const cacheKey = `api:${endpoint}`;

      // Check cache first (using same 5s TTL as other token stats)
      const cachedData = getCache<TokenSentimentStats>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Call the main 'api' helper (which routes public GET requests for tokens/ via publicApi)
      const data = await api<TokenSentimentStats>(endpoint);
      setCache(cacheKey, data, 5 * 1000);
      return data;
    } catch (error) {
      console.error(`Error fetching token sentiments for ${mintAddress}:`, error);
      throw error;
    }
  },

  addOrUpdateSentiment: async (
    mintAddress: string,
    sentimentType: SentimentType,
  ): Promise<{ success: boolean }> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/sentiment`;

      // Call the main 'api' helper.
      // NOTE: If the main 'api' function routes this POST request via publicApi due to the 'tokens/' path,
      // this will result in a 401 Unauthorized error because publicApi omits credentials.
      const data = await api<{ success: boolean }>(endpoint, {
        method: 'POST',
        body: { sentimentType }, // Body expected by the backend controller
      });

      // Invalidate cache for this endpoint after modification
      const cacheKey = `api:${endpoint}`;
      apiCache.delete(cacheKey);

      return data;
    } catch (error) {
      console.error(`Error adding/updating sentiment for ${mintAddress}:`, error);
      throw error; // Re-throw for the component to handle
    }
  },

  removeSentiment: async (mintAddress: string): Promise<{ success: boolean }> => {
    try {
      const sanitizedMintAddress = encodeURIComponent(mintAddress);
      const endpoint = `tokens/${sanitizedMintAddress}/sentiment`;

      // Call the main 'api' helper.
      // NOTE: If the main 'api' function routes this DELETE request via publicApi due to the 'tokens/' path,
      // this will result in a 401 Unauthorized error because publicApi omits credentials.
      const data = await api<{ success: boolean }>(endpoint, {
        method: 'DELETE',
      });

      // Invalidate cache for this endpoint after modification
      const cacheKey = `api:${endpoint}`;
      apiCache.delete(cacheKey);

      return data;
    } catch (error) {
      console.error(`Error removing sentiment for ${mintAddress}:`, error);
      throw error; // Re-throw for the component to handle
    }
  },

  getCurrentTokenPrice: (mintAddress: string): Promise<{ price: number }> =>
    api<{ price: number }>(`tokens/${mintAddress}/current-price`),

  hot: async (
    page: number = 1,
    limit: number = 5,
    timePeriod: string = '7d',
  ): Promise<PaginatedHotTokensResult> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('timePeriod', timePeriod);
      const endpoint = `tokens/hot?${params.toString()}`;
      const data = await api<PaginatedHotTokensResult>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching hot tokens:`, error);
      return { items: [], meta: { total: 0, page: 1, limit: limit, totalPages: 0 } };
    }
  },

  getBundles: async (mintAddress: string): Promise<ProcessedBundleData> => {
    if (!mintAddress) {
      throw new Error('Mint address is required for fetching bundles.');
    }

    try {
      const endpoint = `tokens/${encodeURIComponent(mintAddress)}/bundles`;
      const data = await api<ProcessedBundleData>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching bundle data for ${mintAddress}:`, error);
      throw error;
    }
  },
};

// Keep local DTO definition if not shared
interface UpdateFollowPreferencesDto {
  prediction?: boolean;
  comment?: boolean;
  vote?: boolean;
}

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

  getFollowers: async (userId: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const endpoint = `users/${userId}/followers?${params.toString()}`;
    return api<{
      data: User[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(endpoint);
  },

  getFollowing: async (userId: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const endpoint = `users/${userId}/following?${params.toString()}`;
    return api<{
      data: User[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(endpoint);
  },

  follow: async (userId: string) => {
    try {
      return api<void>(`users/${userId}/follow`, { method: 'POST' });
    } catch (error) {
      console.error('Follow request failed:', error);
      throw error;
    }
  },

  unfollow: async (userId: string) => {
    try {
      return api<void>(`users/${userId}/follow`, { method: 'DELETE' });
    } catch (error) {
      console.error('Unfollow request failed:', error);
      throw error;
    }
  },

  getFollowRelationship: async (followerId: string, followedId: string) => {
    try {
      const result = await api<{ isFollowing: boolean }>('users/follow-status', {
        method: 'POST',
        body: { followerId, followedId },
        cache: 'no-store',
      });
      return result;
    } catch (error) {
      console.warn('Error checking follow status (might be expected if not logged in):', error);
      return { isFollowing: false };
    }
  },

  getFollowRelationshipDetails: async (followedId: string): Promise<UserFollows | null> => {
    if (!followedId) return null;
    try {
      const endpoint = `users/${followedId}/follow/details`;
      const cacheKey = `api:${endpoint}:me`;

      const cached = getCache<UserFollows>(cacheKey);
      if (cached) return cached;

      const data = await api<UserFollows>(endpoint, {
        cache: 'no-store',
      });
      setCache(cacheKey, data, 60 * 1000);
      return data;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
        return null;
      }
      console.warn(
        `Error fetching follow relationship details for followedId ${followedId}:`,
        error,
      );
      throw error;
    }
  },

  updateFollowPreferences: async (
    followedId: string,
    preferences: UpdateFollowPreferencesDto,
  ): Promise<UserFollows> => {
    try {
      const endpoint = `users/${followedId}/follow/preferences`;
      const updatedFollow = await api<UserFollows>(endpoint, {
        method: 'PATCH',
        body: preferences,
      });

      const cacheKey = `api:users/${followedId}/follow/details:me`;
      if (apiCache.has(cacheKey)) {
        setCache(cacheKey, updatedFollow, 60 * 1000);
      }

      return updatedFollow;
    } catch (error) {
      console.error(`Error updating follow preferences for followedId ${followedId}:`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to update preferences');
    }
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

      const data = await api<{ isWatchlisted: boolean }>(endpoint);
      return data.isWatchlisted;
    } catch (error) {
      console.error(`Error checking token watchlist status for ${mintAddress}:`, error);
      throw error;
    }
  },

  folders: {
    // API methods for token folders
    getTokenFolders: async (): Promise<WatchlistFolder[]> => {
      try {
        const endpoint = 'watchlist/folders/tokens';
        const data = await api<WatchlistFolder[]>(endpoint);
        return data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          // Token gated feature
          return [];
        }
        console.error('[getTokenFolders] Error fetching token folders:', error);
        throw error;
      }
    },

    checkFolderAccess: async (): Promise<{ currentBalance: number; requiredBalance: number }> => {
      try {
        const endpoint = 'watchlist/folders/access-check';
        const data = await api<{ currentBalance: number; requiredBalance: number }>(endpoint);
        return data;
      } catch (error) {
        console.error('[checkFolderAccess] Error checking folder access:', error);
        throw error;
      }
    },

    getUserFolders: async (): Promise<WatchlistFolder[]> => {
      try {
        const endpoint = 'watchlist/folders/users';
        const data = await api<WatchlistFolder[]>(endpoint);
        return data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          // Token gated feature
          return [];
        }
        console.error('[getUserFolders] Error fetching user folders:', error);
        throw error;
      }
    },

    createFolder: async (name: string, folderType: 'token' | 'user'): Promise<WatchlistFolder> => {
      try {
        const endpoint = 'watchlist/folders';
        const data = await api<WatchlistFolder>(endpoint, {
          method: 'POST',
          body: { name, folderType },
        });
        return data;
      } catch (error) {
        console.error('[createFolder] Error creating folder:', error);
        throw error;
      }
    },

    updateFolder: async (
      folderId: string,
      data: { name?: string; position?: number },
    ): Promise<WatchlistFolder> => {
      try {
        const endpoint = `watchlist/folders/${folderId}`;
        const updatedFolder = await api<WatchlistFolder>(endpoint, {
          method: 'PUT',
          body: data,
        });
        return updatedFolder;
      } catch (error) {
        console.error('[updateFolder] Error updating folder:', error);
        throw error;
      }
    },

    deleteFolder: async (folderId: string): Promise<void> => {
      try {
        const endpoint = `watchlist/folders/${folderId}`;
        await api<void>(endpoint, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('[deleteFolder] Error deleting folder:', error);
        throw error;
      }
    },

    getFolderTokens: async (folderId: string): Promise<(Token & { position: number })[]> => {
      try {
        const endpoint = `watchlist/folders/tokens/${folderId}/items`;
        const data = await api<(Token & { position: number })[]>(endpoint);
        return data;
      } catch (error) {
        console.error('[getFolderTokens] Error fetching folder tokens:', error);
        throw error;
      }
    },

    addTokenToFolder: async (
      folderId: string,
      tokenMintAddress: string,
    ): Promise<{ success: boolean }> => {
      try {
        const endpoint = `watchlist/folders/tokens/${folderId}/items`;
        const data = await api<{ success: boolean }>(endpoint, {
          method: 'POST',
          body: { tokenMintAddress },
        });
        return data;
      } catch (error) {
        console.error('[addTokenToFolder] Error adding token to folder:', error);
        throw error;
      }
    },

    removeTokenFromFolder: async (folderId: string, tokenMintAddress: string): Promise<void> => {
      try {
        const endpoint = `watchlist/folders/tokens/${folderId}/items/${tokenMintAddress}`;
        await api<void>(endpoint, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('[removeTokenFromFolder] Error removing token from folder:', error);
        throw error;
      }
    },

    updateTokenPosition: async (
      folderId: string,
      tokenMintAddress: string,
      position: number,
    ): Promise<void> => {
      try {
        const endpoint = `watchlist/folders/tokens/${folderId}/items/${tokenMintAddress}/position`;
        await api<void>(endpoint, {
          method: 'PUT',
          body: { position },
        });
      } catch (error) {
        console.error('[updateTokenPosition] Error updating token position:', error);
        throw error;
      }
    },

    getFolderUsers: async (folderId: string): Promise<(User & { position: number })[]> => {
      try {
        const endpoint = `watchlist/folders/users/${folderId}/items`;
        const data = await api<(User & { position: number })[]>(endpoint);
        return data;
      } catch (error) {
        console.error('[getFolderUsers] Error fetching folder users:', error);
        throw error;
      }
    },

    addUserToFolder: async (folderId: string, userId: string): Promise<{ success: boolean }> => {
      try {
        const endpoint = `watchlist/folders/users/${folderId}/items`;
        const data = await api<{ success: boolean }>(endpoint, {
          method: 'POST',
          body: { userId },
        });
        return data;
      } catch (error) {
        console.error('[addUserToFolder] Error adding user to folder:', error);
        throw error;
      }
    },

    removeUserFromFolder: async (folderId: string, userId: string): Promise<void> => {
      try {
        const endpoint = `watchlist/folders/users/${folderId}/items/${userId}`;
        await api<void>(endpoint, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('[removeUserFromFolder] Error removing user from folder:', error);
        throw error;
      }
    },

    updateUserPosition: async (
      folderId: string,
      userId: string,
      position: number,
    ): Promise<void> => {
      try {
        const endpoint = `watchlist/folders/users/${folderId}/items/${userId}/position`;
        await api<void>(endpoint, {
          method: 'PUT',
          body: { position },
        });
      } catch (error) {
        console.error('[updateUserPosition] Error updating user position:', error);
        throw error;
      }
    },
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
    return api<{ preferences: Record<string, NotificationPreference> }>(
      'notifications/preferences',
    );
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

  // Telegram connection methods
  generateTelegramToken: async () => {
    return api<{
      token: string;
    }>('telegram/user/generate-token', {
      method: 'POST',
    });
  },

  getTelegramStatus: async () => {
    return api<{
      isConnected: boolean;
      status: string;
      connectedUsername: string | null;
      connectedFirstName: string | null;
      connectedAt: string | null;
    }>('telegram/user/status');
  },

  disconnectTelegram: async () => {
    return api<{ success: boolean }>('telegram/user/disconnect', {
      method: 'DELETE',
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

export const referrals = {
  getMyCode: async (): Promise<{ referralCode: string }> => {
    return api<{ referralCode: string }>('referrals/me/code');
  },

  getMyStatus: async (): Promise<{ hasBeenReferred: boolean; referrerUsername?: string }> => {
    return api<{ hasBeenReferred: boolean; referrerUsername?: string }>('referrals/me/status');
  },

  getMyHistory: async (): Promise<Referral[]> => {
    return api<Referral[]>('referrals/me/history');
  },

  applyCode: async (referralCode: string): Promise<{ referrerUsername: string }> => {
    return api<{ referrerUsername: string }>('referrals/me/apply', {
      method: 'POST',
      body: { referralCode },
    });
  },

  getLeaderboard: async (
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<ReferralLeaderboardEntry>> => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return api<PaginatedResult<ReferralLeaderboardEntry>>(
      `referrals/leaderboard?${params.toString()}`,
    );
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

export interface TokenCallListFilters {
  username?: string;
  userId?: string;
  tokenId?: string;
  tokenSearch?: string;
  status?: TokenCallStatus[];
  callStartDate?: string;
  callEndDate?: string;
  targetStartDate?: string;
  targetEndDate?: string;
}

export interface TokenCallListSort {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const tokenCalls = {
  create: async (
    data: CreateTokenCallInput,
  ): Promise<{ tokenCall: TokenCall; comment: Comment }> => {
    try {
      const response = await api<{ tokenCall: TokenCall; comment: Comment }>('token-calls', {
        method: 'POST',
        body: data,
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to create prediction');
    }
  },

  getTokenCalls: async (
    tokenId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    items: TokenCall[];
    total: number;
    page: number;
    limit: number;
  }> => {
    try {
      const response = await api<{
        items: TokenCall[];
        total: number;
        page: number;
        limit: number;
      }>(`token-calls?tokenId=${tokenId}&page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to fetch token calls');
    }
  },

  getUserStats: async (
    userId?: string,
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    accuracyRate: number;
    averageGainPercent?: number | null;
    averageTimeToHitRatio?: number | null;
    averageMultiplier?: number | null;
    averageMarketCapAtCallTime?: number | null;
  }> => {
    try {
      const endpoint = userId ? `users/${userId}/token-call-stats` : 'users/me/token-call-stats';
      const response = await api<{
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        accuracyRate: number;
        averageGainPercent?: number | null;
        averageTimeToHitRatio?: number | null;
        averageMultiplier?: number | null;
        averageMarketCapAtCallTime?: number | null;
      }>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to fetch user token call stats');
    }
  },

  list: async (
    filters: TokenCallListFilters,
    pagination: { page?: number; limit?: number },
    sort?: TokenCallListSort,
  ) => {
    const params = new URLSearchParams();
    if (filters.username) params.append('username', filters.username);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.tokenId) params.append('tokenId', filters.tokenId);
    if (filters.tokenSearch) params.append('tokenSearch', filters.tokenSearch);
    if (filters.status && filters.status.length > 0) {
      params.append('status', filters.status.join(','));
    }
    if (filters.callStartDate) params.append('callStartDate', filters.callStartDate);
    if (filters.callEndDate) params.append('callEndDate', filters.callEndDate);
    if (filters.targetStartDate) params.append('targetStartDate', filters.targetStartDate);
    if (filters.targetEndDate) params.append('targetEndDate', filters.targetEndDate);
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (sort?.sortBy) params.append('sortBy', sort.sortBy);
    if (sort?.sortOrder) params.append('sortOrder', sort.sortOrder);

    const endpoint = `token-calls?${params.toString()}`;
    return api<PaginatedTokenCallsResult>(endpoint);
  },

  getById: async (callId: string): Promise<TokenCall> => {
    try {
      const endpoint = `token-calls/${callId}`;
      const response = await api<{
        tokenCall: TokenCall;
        comment: Comment | null;
      }>(endpoint);
      if (!response || !response.tokenCall) {
        throw new Error(`Failed to fetch token call data for ID: ${callId}`);
      }
      return {
        ...response.tokenCall,
        explanationComment: response.comment || null,
      } as TokenCall & { explanationComment: Comment | null };
    } catch (error) {
      throw error;
    }
  },
};

export const tokenCallsLeaderboard = {
  getLeaderboard: async (
    page = 1,
    limit = 25,
    sortBy?: string,
  ): Promise<{
    items: Array<{
      rank: number;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string;
      };
      totalCalls: number;
      successfulCalls: number;
      accuracyRate: number;
      averageTimeToHitRatio: number | null;
      averageMultiplier: number | null;
      averageMarketCapAtCallTime: number | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (sortBy) params.append('sortBy', sortBy);

      const endpoint = `leaderboards/token-calls?${params.toString()}`;
      return api<{
        items: Array<{
          rank: number;
          user: {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string;
          };
          totalCalls: number;
          successfulCalls: number;
          accuracyRate: number;
          averageTimeToHitRatio: number | null;
          averageMultiplier: number | null;
          averageMarketCapAtCallTime: number | null;
        }>;
        total: number;
        page: number;
        limit: number;
      }>(endpoint);
    } catch (error) {
      console.error('Error fetching token calls leaderboard:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to fetch token calls leaderboard');
    }
  },
};

export const dev = {
  admin: {
    /*
    // DEPRECATED: Function to CREATE missing comments
    backfillDefaultComments: async (): Promise<{ message: string }> => {
      return api<{ message: string }>(
        'admin/dev/backfill-default-token-call-comments',
        { method: 'POST' },
      );
    },
    */

    /*
    // DEPRECATED: Function to LINK existing comments
    linkExistingExplanationComments: async (): Promise<{
      message: string;
      updated: number;
      failed: number;
      skippedAlreadyLinked: number;
      skippedNotFound: number;
    }> => {
      return api<{
        message: string;
        updated: number;
        failed: number;
        skippedAlreadyLinked: number;
        skippedNotFound: number;
      }>('admin/dev/link-existing-token-call-comments', { method: 'POST' });
    },
    */

    // Function to FIX timestamps
    fixCommentTimestamps: async (): Promise<{
      message: string;
      updated: number;
      failed: number;
    }> => {
      return api<{
        message: string;
        updated: number;
        failed: number;
      }>('admin/dev/fix-backfilled-comment-timestamps', { method: 'POST' });
    },
  },
};

export const feed = {
  getFollowing: async (
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<FeedActivity>> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const endpoint = `feed/following?${params.toString()}`;
      const data = await api<PaginatedResult<FeedActivity>>(endpoint);
      return data;
    } catch (error) {
      console.error('[getFollowingFeed] Error fetching following feed:', error);
      throw error;
    }
  },
};
