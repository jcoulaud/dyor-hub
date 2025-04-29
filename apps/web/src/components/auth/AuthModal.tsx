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
import { Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { toast } = useToast();
  const [displayedReferralCode, setDisplayedReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const codeFromStorage = localStorage.getItem('pendingReferralCode');
      setDisplayedReferralCode(codeFromStorage);
    }
  }, [isOpen]);

  const handleTwitterLogin = async () => {
    try {
      const loginUrl = await auth.getTwitterLoginUrl({
        usePopup: false,
        referralCode: displayedReferralCode,
      });
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Failed to get Twitter login URL', error);
      toast({
        title: 'Error',
        description: 'Could not initiate Twitter login. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          {displayedReferralCode ? (
            <DialogDescription>
              Joining with referral code: <strong>{displayedReferralCode}</strong>. Sign in below.
            </DialogDescription>
          ) : (
            <DialogDescription>Please sign in with Twitter to continue</DialogDescription>
          )}
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
