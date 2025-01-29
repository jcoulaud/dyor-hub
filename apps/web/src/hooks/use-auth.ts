import { auth } from '@/lib/api';
import { User as ApiUser } from '@dyor-hub/types';
import { useCallback, useEffect, useRef, useState } from 'react';

type User = Pick<ApiUser, 'id' | 'displayName' | 'username' | 'avatarUrl'>;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

// Cache the auth state for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedState: AuthState | null = null;
let cacheTimestamp: number | null = null;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // Use a ref to track if a request is in progress
  const requestInProgress = useRef<Promise<void> | null>(null);

  const checkAuth = useCallback(async (force = false) => {
    // If we have a cached state and it's not expired, use it
    if (!force && cachedState && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setState(cachedState);
      return;
    }

    // If there's already a request in progress, wait for it
    if (requestInProgress.current) {
      await requestInProgress.current;
      return;
    }

    try {
      // Create a new request promise
      requestInProgress.current = (async () => {
        try {
          const response = await auth.getProfile();
          const newState = {
            isAuthenticated: response.authenticated,
            user: response.user || null,
            isLoading: false,
          };
          setState(newState);

          // Update cache
          cachedState = newState;
          cacheTimestamp = Date.now();
        } catch (err) {
          const newState = {
            isAuthenticated: false,
            user: null,
            isLoading: false,
          };
          setState(newState);

          // Update cache
          cachedState = newState;
          cacheTimestamp = Date.now();
        }
      })();

      await requestInProgress.current;
    } finally {
      requestInProgress.current = null;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    checkAuth: () => checkAuth(true), // Force refresh when called manually
  };
}
