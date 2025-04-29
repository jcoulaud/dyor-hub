'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { tipping } from '@/lib/api';
import type { GetTippingEligibilityResponseDto } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { TipModal } from './TipModal';

interface TipButtonProps {
  recipientUserId: string;
  recipientUsername?: string;
  contentType: string;
  contentId?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'footer';
  className?: string;
}

export const TipButton = ({
  recipientUserId,
  recipientUsername,
  contentType,
  contentId,
  size = 'sm',
  variant = 'default',
  className,
}: TipButtonProps) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] =
    useState<GetTippingEligibilityResponseDto | null>(null);

  const handleClick = useCallback(async () => {
    setIsChecking(true);
    setEligibilityResult(null);
    let eligibilityData: GetTippingEligibilityResponseDto | null = null;
    try {
      if (recipientUserId) {
        eligibilityData = await tipping.getEligibility(recipientUserId);
        setEligibilityResult(eligibilityData);
      }
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch tipping eligibility:', err);
      toast({
        title: 'Error',
        description: 'Could not check user eligibility.',
        variant: 'destructive',
      });
      setEligibilityResult(null);
      setModalOpen(false);
    } finally {
      setIsChecking(false);
    }
  }, [recipientUserId, toast]);

  // For footer variant, render a text link instead of a button
  if (variant === 'footer') {
    return (
      <>
        <button
          className='flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors h-8 px-2 cursor-pointer hover:bg-zinc-800/70 rounded-md'
          onClick={handleClick}
          disabled={isChecking}>
          {isChecking ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Coins className='h-4 w-4' />
          )}
          <span className='text-xs sm:text-[13px]'>Tip</span>
        </button>

        {modalOpen && (
          <TipModal
            isOpen={modalOpen}
            onOpenChange={setModalOpen}
            eligibilityResult={eligibilityResult}
            recipientUserId={recipientUserId}
            recipientUsername={recipientUsername}
            contentType={contentType}
            contentId={contentId}
            senderPublicKey={publicKey?.toBase58() || null}
          />
        )}
      </>
    );
  }

  // Default button style for profile and token call page
  const baseClasses =
    'bg-black/40 rounded-md border border-amber-900/40 px-4 py-1.5 transition-colors';

  return (
    <>
      <Button
        variant='ghost'
        size={size}
        className={`${baseClasses} text-amber-500 hover:text-amber-400 hover:border-amber-500/50 ${
          isChecking ? 'cursor-wait opacity-80' : 'cursor-pointer'
        } ${className || ''}`}
        onClick={handleClick}
        disabled={isChecking}>
        {isChecking ? (
          <span className='flex items-center'>
            {size === 'icon' ? (
              <Loader2 className='h-4 w-4 animate-spin text-amber-500' />
            ) : (
              <>
                <Loader2 className='mr-1.5 h-4 w-4 animate-spin text-amber-500' />
                <span>Tip</span>
              </>
            )}
          </span>
        ) : (
          <span className='flex items-center'>
            {size === 'icon' ? (
              <Coins className='h-4 w-4' />
            ) : (
              <>
                <Coins className='mr-1.5 h-4 w-4' />
                <span>Tip</span>
              </>
            )}
          </span>
        )}
      </Button>

      {modalOpen && (
        <TipModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          eligibilityResult={eligibilityResult}
          recipientUserId={recipientUserId}
          recipientUsername={recipientUsername}
          contentType={contentType}
          contentId={contentId}
          senderPublicKey={publicKey?.toBase58() || null}
        />
      )}
    </>
  );
};
