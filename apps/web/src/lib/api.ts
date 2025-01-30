import type { Comment, VoteType } from '@dyor-hub/types';
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
  list: (tokenMintAddress: string) =>
    api<Comment[]>(`comments?tokenMintAddress=${tokenMintAddress}`),

  create: (data: { content: string; tokenMintAddress: string }) =>
    api<Comment>('comments', { method: 'POST', body: data }),

  vote: (commentId: string, type: 'upvote' | 'downvote') =>
    api<VoteResponse>(`comments/${commentId}/vote`, {
      method: 'POST',
      body: { type },
    }),
};

export const auth = {
  getProfile: () => api('auth/profile'),
  logout: () => api('auth/logout', { method: 'GET' }),
};

export const tokens = {
  getByMintAddress: (mintAddress: string) => api<Token>(`tokens/${mintAddress}`),
};
