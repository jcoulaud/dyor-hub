'use client';

import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RefreshTokenButtonProps {
  mintAddress: string;
}

export function RefreshTokenButton({ mintAddress }: RefreshTokenButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await tokens.refreshToken(mintAddress);
      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      size='sm'
      variant='outline'
      className='h-8 px-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
      disabled={isRefreshing}>
      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span className='text-xs'>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
    </Button>
  );
}
