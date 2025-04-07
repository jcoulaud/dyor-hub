'use client';

import { useToast } from '@/hooks/use-toast';
import { auth, gamification } from '@/lib/api';
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // Use refs to track request state and caching
  const requestInProgress = useRef<Promise<void> | null>(null);
  const cacheTimestamp = useRef<number | null>(null);
  const cachedState = useRef<AuthState | null>(null);

  const { toast } = useToast();

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

            // If authenticated, perform a daily check-in
            if (response.authenticated && response.user) {
              gamification.streaks.checkIn();
            }
          } catch (error) {
            console.error('Failed to fetch profile:', error);
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

  // Add this effect to the AuthProvider component to check for auth parameters in the URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);

      // Check for auth_success parameter
      const authSuccess = url.searchParams.get('auth_success');
      if (authSuccess === 'true') {
        toast({
          title: 'Success',
          description: 'Successfully signed in with Twitter',
        });

        // Remove the parameter from URL
        url.searchParams.delete('auth_success');
        window.history.replaceState({}, document.title, url.toString());

        // Force refresh auth state
        checkAuth(true);
      }

      // Check for auth_error parameter
      const authError = url.searchParams.get('auth_error');
      if (authError) {
        toast({
          title: 'Authentication Error',
          description: decodeURIComponent(authError),
          variant: 'destructive',
        });

        // Remove the parameter from URL
        url.searchParams.delete('auth_error');
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, [toast, checkAuth]);

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
};
