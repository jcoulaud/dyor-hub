'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/api';
import { Twitter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

// Create a separate component for handling auth params
const AuthParamsHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const hasHandledParams = useRef(false);

  useEffect(() => {
    // Handle auth parameters in the main window
    if (hasHandledParams.current) return;

    const authError = searchParams?.get('auth_error');
    const authSuccess = searchParams?.get('auth_success');

    if (authError || authSuccess) {
      hasHandledParams.current = true;

      if (authError) {
        toast({
          title: 'Authentication Failed',
          description: `${decodeURIComponent(authError)}. Please try again or contact support if the problem persists.`,
          variant: 'destructive',
        });
      } else if (authSuccess) {
        toast({
          title: 'Success',
          description: 'Authentication successful!',
        });
      }

      // Use setTimeout to ensure this happens after the current render cycle
      setTimeout(() => {
        router.replace(window.location.pathname);
      }, 0);
    }
  }, [searchParams, router, toast]);

  return null;
};

export const TwitterLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    try {
      setIsLoading(true);

      // Get the Twitter login URL - explicitly set usePopup to false
      const loginUrl = await auth.getTwitterLoginUrl(false);

      // Force same-window navigation by using window.location.replace
      // This is more explicit than window.location.href and helps with Arc browser
      window.location.replace(loginUrl);

      // Note: We don't need to reset isLoading since we're navigating away
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start authentication process. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <AuthParamsHandler />
      </Suspense>
      <Button
        onClick={handleLogin}
        variant='outline'
        disabled={isLoading}
        aria-label='Sign in with Twitter'>
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
    </>
  );
};
