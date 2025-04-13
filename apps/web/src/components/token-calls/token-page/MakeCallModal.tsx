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
import { useState } from 'react';
import { MakeCallForm } from './MakeCallForm';

interface MakeCallModalProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  onCallCreated?: () => void;
  currentMarketCap?: number;
  circulatingSupply?: string;
}

export function MakeCallModal({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  onCallCreated,
  currentMarketCap,
  circulatingSupply,
}: MakeCallModalProps) {
  const [open, setOpen] = useState(false);

  const handleCallCreated = () => {
    onCallCreated?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md py-3 flex items-center justify-center'>
          <ArrowUp className='h-4 w-4 text-white mr-2' />
          <span>Make a Prediction</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[420px] bg-zinc-900 border-zinc-800'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>Make a Price Prediction</DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Predict where ${tokenSymbol} price will go and track your success rate.
          </DialogDescription>
        </DialogHeader>
        <MakeCallForm
          tokenId={tokenId}
          tokenSymbol={tokenSymbol}
          currentTokenPrice={currentTokenPrice}
          onCallCreated={handleCallCreated}
          onClose={() => setOpen(false)}
          currentMarketCap={currentMarketCap}
          circulatingSupply={circulatingSupply}
        />
      </DialogContent>
    </Dialog>
  );
}
