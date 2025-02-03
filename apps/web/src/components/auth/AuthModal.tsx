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
      // Wait a bit to ensure the session is established
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Force check auth state to bypass cache
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
      console.error('Auth success handler failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete authentication',
        variant: 'destructive',
      });
    }
  }, [checkAuth, onAuthSuccess, onClose]);

  const handleTwitterLogin = () => {
    console.log('Starting Twitter login...');
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter?returnUrl=${encodeURIComponent(window.location.origin)}`;
    console.log('Opening auth window with URL:', authUrl);

    const popup = window.open(
      authUrl,
      'Twitter Login',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      console.error('Failed to open popup window');
      toast({
        title: 'Error',
        description: 'Failed to open authentication window. Please ensure pop-ups are allowed.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Auth window opened, setting up message listener...');
    const messageHandler = async (event: MessageEvent) => {
      console.log('Received message:', event.data);

      // Verify the message origin
      if (event.origin !== process.env.NEXT_PUBLIC_API_URL) {
        console.warn('Received message from unexpected origin:', event.origin);
        return;
      }

      if (event.data?.type === 'AUTH_SUCCESS') {
        console.log('Received AUTH_SUCCESS message');
        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);
        try {
          await handleAuthSuccess();
        } catch (error) {
          console.error('Failed to handle auth success message:', error);
          toast({
            title: 'Error',
            description:
              error instanceof Error ? error.message : 'Failed to complete authentication',
            variant: 'destructive',
          });
        }
      }
    };

    window.addEventListener('message', messageHandler);

    console.log('Starting polling for window close...');
    const pollTimer = setInterval(async () => {
      if (popup?.closed) {
        console.log('Auth window closed, cleaning up...');
        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);
        try {
          await handleAuthSuccess();
        } catch (error) {
          console.error('Twitter auth error after window close:', error);
          toast({
            title: 'Error',
            description:
              error instanceof Error ? error.message : 'Failed to authenticate with Twitter',
            variant: 'destructive',
          });
        }
      }
    }, 500);

    // Add a timeout to clear the interval if the window is never closed
    setTimeout(() => {
      if (!popup.closed) {
        console.warn('Auth window timeout - cleaning up...');
        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);
        popup.close();
        toast({
          title: 'Error',
          description: 'Authentication timed out. Please try again.',
          variant: 'destructive',
        });
      }
    }, 300000); // 5 minutes timeout
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
