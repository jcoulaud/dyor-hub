'use client';

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
    } catch {
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
      } catch {
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
          <button
            onClick={handleTwitterLogin}
            className='h-10 bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white rounded-lg px-5 py-2 flex items-center justify-center gap-2.5 transition-shadow duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed'
            aria-label='Sign in with Twitter'
            type='button'>
            <span className='flex items-center gap-2.5'>
              <Twitter className='h-4 w-4' />
              <span>Sign in with Twitter</span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
