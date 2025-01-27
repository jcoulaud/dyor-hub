'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Token } from '@dyor-hub/types';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RefreshTokenButtonProps {
  token: Token;
}

export function RefreshTokenButton({ token }: RefreshTokenButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (token.lastRefreshedAt) {
      const minutesSinceLastRefresh =
        (Date.now() - new Date(token.lastRefreshedAt).getTime()) / (1000 * 60);

      if (minutesSinceLastRefresh < 5) {
        toast({
          title: 'Refresh request received',
          description:
            'Your request has been registered. Please note that metadata updates are limited to once every 5 minutes.',
          duration: 5000,
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tokens/${token.mintAddress}/refresh`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refresh token data');
      }

      toast({
        title: 'Success',
        description: 'Token metadata refresh request has been sent successfully.',
        duration: 3000,
      });

      router.refresh();
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to refresh token data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleRefresh}
      disabled={isLoading}
      className='gap-2'>
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      Refresh Metadata
    </Button>
  );
}
