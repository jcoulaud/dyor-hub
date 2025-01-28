'use client';

import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/providers/auth-provider';
import { useCallback, useEffect, useRef } from 'react';

export const TwitterLoginButton = () => {
  const { checkAuth } = useAuthContext();
  const checkingAuth = useRef(false);

  const handleAuthSuccess = useCallback(async () => {
    if (checkingAuth.current) return;
    checkingAuth.current = true;

    try {
      await checkAuth();
    } finally {
      checkingAuth.current = false;
    }
  }, [checkAuth]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'AUTH_SUCCESS') {
        handleAuthSuccess();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleAuthSuccess]);

  const handleLogin = () => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter`,
      'Twitter Login',
      `width=${width},height=${height},left=${left},top=${top},status=no,scrollbars=yes,resizable=yes`,
    );

    // Keep focus on popup
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        // Check auth state when popup closes
        handleAuthSuccess();
      } else {
        popup?.focus();
      }
    }, 1000);
  };

  return (
    <Button onClick={handleLogin} variant='outline'>
      Continue with Twitter
    </Button>
  );
};
