'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { Twitter } from 'lucide-react';
import { useCallback } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => Promise<void>;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const { checkAuth } = useAuthContext();

  const handleAuthSuccess = useCallback(async () => {
    try {
      await checkAuth(true);

      if (onAuthSuccess) {
        await onAuthSuccess();
      }

      toast({
        title: 'Success',
        description: 'Successfully signed in with Twitter',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete authentication',
        variant: 'destructive',
      });
    }
  }, [checkAuth, onAuthSuccess, onClose, toast]);

  const handleTwitterLogin = () => {
    auth.twitterLogin();

    // Set up a simple interval to check auth status
    const checkAuthTimer = setInterval(async () => {
      try {
        await handleAuthSuccess();
        clearInterval(checkAuthTimer);
      } catch (error) {
        // Silently fail - will retry on next interval
      }
    }, 3000);

    // Clear the timer after 30 seconds (failsafe)
    setTimeout(() => clearInterval(checkAuthTimer), 30000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>Please sign in with Twitter to continue</DialogDescription>
        </DialogHeader>
        <div className='flex flex-col items-center space-y-4 py-4'>
          <Button
            onClick={handleTwitterLogin}
            className='flex items-center space-x-2'
            variant='outline'>
            <Twitter className='h-5 w-5' />
            <span>Sign in with Twitter</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
