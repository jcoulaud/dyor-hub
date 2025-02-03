import type { Comment, User, VoteType } from '@dyor-hub/types';
import { Token } from '@dyor-hub/types';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiOptions extends RequestInit {
  body?: any;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

const api = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  // Ensure endpoint starts with /api
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api/${endpoint}`;
  const url = `${API_URL}${apiEndpoint}`;

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Always include credentials (cookies)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      // Don't throw for profile check when not authenticated
      if (endpoint === 'auth/profile') {
        throw new ApiError(401, 'Unauthorized');
      }
    }

    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'An error occurred');
  }

  // Return null for 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
};

interface VoteResponse {
  upvotes: number;
  downvotes: number;
  userVoteType: VoteType | null;
}

// Typed API methods
export const comments = {
  list: async (tokenMintAddress: string): Promise<Comment[]> => {
    const response = await api<Comment[]>(`comments?tokenMintAddress=${tokenMintAddress}`);
    return response;
  },

  create: async (data: { content: string; tokenMintAddress: string }): Promise<Comment> => {
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
};

export const tokens = {
  getByMintAddress: (mintAddress: string) => api<Token>(`tokens/${mintAddress}`),
};
