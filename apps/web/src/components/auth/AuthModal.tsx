'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/api';
import { Twitter } from 'lucide-react';
import { useCallback } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => Promise<void>;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const { checkAuth } = useAuth();

  const handleAuthSuccess = useCallback(async () => {
    try {
      // Wait a bit to ensure the session is established
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check auth state
      const authState = await auth.getProfile();
      if (!authState.authenticated) {
        throw new Error('Authentication failed');
      }

      // Update local auth state
      await checkAuth();

      if (onAuthSuccess) {
        // Wait a bit more before executing the action to ensure everything is synced
        await new Promise((resolve) => setTimeout(resolve, 500));
        await onAuthSuccess();
      }

      toast({
        title: 'Success',
        description: 'Successfully signed in with Twitter',
      });
      onClose();
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete the action after authentication',
        variant: 'destructive',
      });
    }
  }, [onClose, onAuthSuccess, toast, checkAuth]);

  const handleTwitterLogin = () => {
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter?returnUrl=${encodeURIComponent(window.location.origin)}`,
      'Twitter Login',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    const pollTimer = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(pollTimer);
        try {
          await handleAuthSuccess();
        } catch (error) {
          console.error('Twitter auth error:', error);
          toast({
            title: 'Error',
            description: 'Failed to authenticate with Twitter',
            variant: 'destructive',
          });
        }
      }
    }, 500);
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
