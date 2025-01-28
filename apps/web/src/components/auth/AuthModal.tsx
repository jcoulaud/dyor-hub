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
import { Twitter } from 'lucide-react';
import { useCallback } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { toast } = useToast();

  const handleAuthSuccess = useCallback(async () => {
    toast({
      title: 'Success',
      description: 'Successfully signed in with Twitter',
    });
    onClose();
  }, [onClose, toast]);

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
          await auth.getProfile();
          handleAuthSuccess();
        } catch (error) {
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
