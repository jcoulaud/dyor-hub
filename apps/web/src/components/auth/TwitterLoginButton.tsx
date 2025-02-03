'use client';

import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/providers/auth-provider';
import { Twitter } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export const TwitterLoginButton = () => {
  const { checkAuth } = useAuthContext();
  const checkingAuth = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSuccess = useCallback(async () => {
    if (checkingAuth.current) return;
    checkingAuth.current = true;
    setIsLoading(true);

    try {
      // Force refresh auth state
      await checkAuth(true);
    } finally {
      checkingAuth.current = false;
      setIsLoading(false);
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
    setIsLoading(true);
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter`,
      'Twitter Login',
      `width=${width},height=${height},left=${left},top=${top},status=no,scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      setIsLoading(false);
      return;
    }

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
    <Button onClick={handleLogin} variant='outline' disabled={isLoading}>
      {isLoading ? (
        <span className='flex items-center gap-2'>
          <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
              fill='none'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
          Signing in...
        </span>
      ) : (
        <span className='flex items-center gap-2'>
          <Twitter className='h-4 w-4' />
          Sign in
        </span>
      )}
    </Button>
  );
};
