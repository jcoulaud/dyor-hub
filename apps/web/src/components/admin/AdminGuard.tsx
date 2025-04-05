'use client';

import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/providers/auth-provider';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    // If authenticated but not admin, redirect to home
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
      router.push('/');
      return;
    }

    // If authenticated and admin, allow access
    if (!isLoading && isAuthenticated && user && user.isAdmin) {
      setIsAuthorized(true);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='animate-pulse'>
            <ShieldCheck className='h-12 w-12 text-zinc-400' />
          </div>
          <p className='text-zinc-400'>Verifying admin privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <ShieldAlert className='h-12 w-12 text-red-500' />
          <div className='text-center'>
            <h1 className='text-xl font-bold text-white'>Access Denied</h1>
            <p className='mt-2 text-zinc-400'>
              You don&apos;t have permission to access this area.
            </p>
          </div>
          <Badge variant='outline' className='border-red-800 bg-red-950/30 text-red-400'>
            Admin access required
          </Badge>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
