'use client';

import { auth } from '@/lib/api';
import type { User } from '@dyor-hub/types';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Cache duration of 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

interface AuthContextType extends AuthState {
  checkAuth: (force?: boolean) => Promise<void>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  checkAuth: async () => {},
  clearAuth: () => {},
});

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // Use refs to track request state and caching
  const requestInProgress = useRef<Promise<void> | null>(null);
  const cacheTimestamp = useRef<number | null>(null);
  const cachedState = useRef<AuthState | null>(null);

  const clearAuth = useCallback(() => {
    const newState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
    };
    setState(newState);
    cachedState.current = newState;
    cacheTimestamp.current = Date.now();
  }, []);

  const checkAuth = useCallback(
    async (force = false) => {
      // Use cached state if available and not forced refresh
      if (
        !force &&
        cachedState.current &&
        cacheTimestamp.current &&
        Date.now() - cacheTimestamp.current < CACHE_DURATION
      ) {
        setState(cachedState.current);
        return;
      }

      // If there's already a request in progress, wait for it
      if (requestInProgress.current) {
        await requestInProgress.current;
        return;
      }

      try {
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
            cachedState.current = newState;
            cacheTimestamp.current = Date.now();
          } catch (error) {
            console.error('Auth check failed:', error);
            clearAuth();
          }
        })();

        await requestInProgress.current;
      } finally {
        requestInProgress.current = null;
      }
    },
    [clearAuth],
  );

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        checkAuth,
        clearAuth,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
