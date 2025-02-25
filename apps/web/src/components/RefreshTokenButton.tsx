'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { tokens } from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

export interface RefreshTokenButtonProps {
  mintAddress: string;
}

export function RefreshTokenButton({ mintAddress }: RefreshTokenButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await tokens.refreshToken(mintAddress);

      toast({
        title: 'Success',
        description: 'Token data has been refreshed',
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh token data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant='outline' size='icon' onClick={handleRefresh} disabled={isLoading}>
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    </Button>
  );
}
