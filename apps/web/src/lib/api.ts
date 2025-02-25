import type { Comment, CreateCommentDto, User, VoteType } from '@dyor-hub/types';
import { Token } from '@dyor-hub/types';

// Since frontend and API are now on different domains, use the configured API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Determine if we're using an API subdomain (api.domain.com) or a path-based API (/api)
// Improved detection logic that works in both browser and server environments
const isApiSubdomain = (() => {
  try {
    // Check if the API URL contains an 'api.' subdomain
    const url = new URL(API_BASE_URL);
    return url.hostname.startsWith('api.');
  } catch (error) {
    console.error('Error parsing API_BASE_URL:', error);
    return false;
  }
})();

// Custom API error class for better error handling
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

const api = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  // Handle API endpoint formatting based on whether we're using an API subdomain
  let apiEndpoint = endpoint;

  // If using path-based API or in development, ensure /api prefix
  if (!isApiSubdomain) {
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`;
  } else {
    // If using API subdomain, remove /api prefix if it exists
    apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
  }

  // Ensure the endpoint starts with a slash
  if (!apiEndpoint.startsWith('/')) {
    apiEndpoint = `/${apiEndpoint}`;
  }

  // Construct the full URL
  const url = `${API_BASE_URL}${apiEndpoint}`;

  // Create an AbortController to handle timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Always include credentials (cookies)
      headers: {
        'Content-Type': 'application/json',
        // Add origin header to help with CORS debugging
        ...(typeof window !== 'undefined' && { Origin: window.location.origin }),
        ...options.headers,
      },
      signal: controller.signal,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    clearTimeout(timeoutId); // Clear the timeout if the request completes

    if (!response.ok) {
      if (response.status === 401) {
        // Don't throw for profile check when not authenticated
        if (endpoint === 'auth/profile') {
          throw new ApiError(401, 'Unauthorized');
        }
      }

      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // Ignore parse errors
      }

      throw new ApiError(response.status, errorMessage);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle AbortError specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }

    // Rethrow ApiErrors
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof Error) {
      console.error('API request failed:', error);
      throw new ApiError(0, `Network error: ${error.message}`);
    }

    // Fallback for unknown errors
    throw new ApiError(500, 'Unknown error occurred');
  }
};

// Typed API methods
export const comments = {
  list: async (tokenMintAddress: string): Promise<Comment[]> => {
    const response = await api<Comment[]>(`comments?tokenMintAddress=${tokenMintAddress}`);
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
  getByMintAddress: async (mintAddress: string): Promise<Token> => {
    try {
      const endpoint = `tokens/${mintAddress}`;
      return await api<Token>(endpoint);
    } catch (error) {
      throw error;
    }
  },
  refreshToken: (mintAddress: string) =>
    api<void>(`tokens/${mintAddress}/refresh`, { method: 'POST' }),
};
