import type { Comment, CreateCommentDto, LatestComment, User, VoteType } from '@dyor-hub/types';
import { Token, TokenStats } from '@dyor-hub/types';

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

// Simple in-memory cache for API responses
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const apiCache = new Map<string, CacheItem<unknown>>();
const CACHE_TTL = 60 * 1000; // 1 minute TTL

const getCache = <T>(key: string): T | null => {
  const cached = apiCache.get(key);
  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    apiCache.delete(key);
    return null;
  }

  return cached.data as T;
};

const setCache = <T>(key: string, data: T): void => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const api = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  // Format endpoint based on API routing strategy
  let apiEndpoint = endpoint;

  // Path-based: ensure /api prefix
  if (!isApiSubdomain) {
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`;
  } else {
    // Subdomain-based: remove /api prefix if present
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
  }

  // Ensure leading slash
  if (!apiEndpoint.startsWith('/')) {
    apiEndpoint = `/${apiEndpoint}`;
  }

  // Build full request URL
  const url = `${API_BASE_URL}${apiEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Send cookies with cross-origin requests
      headers: {
        'Content-Type': 'application/json',
        // Help debug CORS issues
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
      if (response.status === 401) {
        // Special case for auth check endpoints
        if (endpoint === 'auth/profile') {
          throw new ApiError(401, 'Unauthorized');
        }
      }

      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // JSON parse failed, use default message
      }

      throw new ApiError(response.status, errorMessage);
    }

    // Empty response
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Request timed out
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }

    // Pass through API errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Connection issues
    if (error instanceof Error) {
      throw new ApiError(0, `Network error: ${error.message}`);
    }

    // Unexpected errors
    throw new ApiError(500, 'Unknown error occurred');
  }
};

// Typed API methods
export const comments = {
  list: async (tokenMintAddress: string): Promise<Comment[]> => {
    const response = await api<Comment[]>(`comments?tokenMintAddress=${tokenMintAddress}`);
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

  refreshToken: (mintAddress: string) => {
    // Clear cache for this token
    const tokenCacheKey = `api:tokens/${mintAddress}`;
    const statsCacheKey = `api:tokens/${mintAddress}/stats`;
    apiCache.delete(tokenCacheKey);
    apiCache.delete(statsCacheKey);

    return api<void>(`tokens/${mintAddress}/refresh`, { method: 'POST' });
  },
};
