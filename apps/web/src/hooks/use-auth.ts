import { auth } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

interface User {
  displayName: string;
  username: string;
  avatarUrl: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await auth.getProfile();
      setState({
        isAuthenticated: response.authenticated,
        user: response.user || null,
        isLoading: false,
      });
    } catch (err) {
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    ...state,
    checkAuth,
  };
}
