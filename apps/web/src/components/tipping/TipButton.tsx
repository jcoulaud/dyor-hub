'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { tipping } from '@/lib/api';
import type { GetTippingEligibilityResponseDto } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
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
    if (!publicKey || !recipientUserId) return;

    setIsChecking(true);
    setEligibilityResult(null);
    let eligibilityData: GetTippingEligibilityResponseDto | null = null;
    try {
      eligibilityData = await tipping.getEligibility(recipientUserId);
      setEligibilityResult(eligibilityData);
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
  }, [publicKey, recipientUserId, toast]);

  // For footer variant, render a text link instead of a button
  if (variant === 'footer') {
    return (
      <>
        <button
          className='flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors h-8 px-2 cursor-pointer hover:bg-zinc-800/70 rounded-md'
          onClick={handleClick}
          disabled={isChecking || !publicKey}>
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
          />
        )}
      </>
    );
  }

  // Default button style for profile and token call page
  const baseClasses =
    'bg-black/40 rounded-md border border-amber-900/40 px-4 py-1.5 transition-colors';

  if (!publicKey) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant='ghost'
                size={size}
                className={`${baseClasses} text-amber-500/70 hover:text-amber-500 hover:border-amber-900/60 disabled:opacity-50 ${className || ''}`}
                disabled>
                {size === 'icon' ? (
                  <Coins className='h-4 w-4' />
                ) : (
                  <span className='flex items-center'>
                    <Coins className='h-4 w-4 mr-1.5' />
                    <span>Tip</span>
                  </span>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side='bottom' className='bg-zinc-800 border-zinc-700 text-zinc-100'>
            <Link href='/account/wallet' className='hover:underline flex items-center gap-1'>
              Connect your wallet to send a tip
              <ExternalLink className='h-3 w-3 opacity-70 ml-1' />
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

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
        />
      )}
    </>
  );
};
