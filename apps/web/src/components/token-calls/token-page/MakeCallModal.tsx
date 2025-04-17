'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MakeCallForm } from './MakeCallForm';

export interface MakeCallModalProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  onCallCreated: () => void;
  circulatingSupply?: string;
  isMakingAnotherCall?: boolean;
}

export function MakeCallModal({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  onCallCreated,
  circulatingSupply,
  isMakingAnotherCall,
}: MakeCallModalProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState);
  };

  const isPriceValid = currentTokenPrice > 0;

  const handleCallCreated = () => {
    onCallCreated?.();
    setOpen(false);
  };

  const formContent = useMemo(() => {
    return (
      <MakeCallForm
        tokenId={tokenId}
        tokenSymbol={tokenSymbol}
        currentTokenPrice={currentTokenPrice}
        onCallCreated={handleCallCreated}
        onClose={() => setOpen(false)}
        circulatingSupply={circulatingSupply}
      />
    );
  }, [tokenId, tokenSymbol, currentTokenPrice, onCallCreated, circulatingSupply]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={'default'}
          className={`
            w-full font-medium rounded-lg py-2.5 flex items-center justify-center
            bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg
            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
          `}>
          <ArrowUp className={`h-4 w-4 mr-2 text-white`} />
          <span className={`font-medium text-white`}>
            {isMakingAnotherCall ? 'Make Another Prediction' : 'Make a Prediction'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[450px] bg-zinc-900 border-zinc-800 rounded-xl shadow-xl'>
        <div className='absolute inset-0 bg-gradient-to-br from-amber-600/5 to-amber-800/5 rounded-xl pointer-events-none' />
        <DialogHeader className='relative'>
          <DialogTitle className='text-xl font-semibold text-white'>
            Make a Price Prediction
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Predict where ${tokenSymbol} price will go and track your success rate.
          </DialogDescription>
          <div className='w-full h-0.5 bg-gradient-to-r from-amber-500/20 to-transparent mt-4'></div>
        </DialogHeader>

        {!isPriceValid ? (
          <div className='py-4'>
            <div className='rounded-lg bg-amber-900/20 border border-amber-900 p-4 shadow-sm'>
              <p className='text-sm font-medium text-amber-400 flex items-center'>
                <span className='mr-2'>⚠️</span>
                Current token price data is unavailable. You can view your existing predictions, but
                new predictions can&apos;t be made until price data is available.
              </p>
            </div>
          </div>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}
