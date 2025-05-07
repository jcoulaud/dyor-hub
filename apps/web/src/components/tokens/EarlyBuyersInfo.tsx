'use client';

import { SolscanButton } from '@/components/SolscanButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EarlyBuyerInfo, EarlyBuyerWallet } from '@dyor-hub/types';
import { CheckCircle2, Copy, MinusCircle, Users } from 'lucide-react';

interface EarlyBuyersInfoProps {
  earlyBuyerInfo: EarlyBuyerInfo | null;
  isLoading: boolean;
  className?: string;
}

const getInitials = (address: string): string => {
  return address.substring(0, 2).toUpperCase();
};

const WalletRow = ({ wallet }: { wallet: EarlyBuyerWallet }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} Copied`, description: `${text} copied to clipboard.` });
    });
  };

  const addressSum = wallet.address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = addressSum % 360;
  const bgColor = `hsla(${hue}, 70%, 40%, 0.2)`;
  const textColor = `hsla(${hue}, 90%, 70%, 1)`;

  return (
    <div className='flex items-center justify-between gap-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-2 hover:bg-zinc-700/50 transition-colors group text-xs'>
      <div className='flex items-center gap-2 flex-1 min-w-0'>
        <Avatar className='h-6 w-6 text-[9px]'>
          <AvatarFallback
            style={{ backgroundColor: bgColor, color: textColor }}
            className='font-mono border border-zinc-600/30'>
            {getInitials(wallet.address)}
          </AvatarFallback>
        </Avatar>
        <span className='font-mono text-zinc-300 truncate' title={wallet.address}>
          {wallet.address}
        </span>
      </div>
      <div className='flex items-center gap-3 flex-shrink-0'>
        {wallet.isHolding ? (
          <Badge
            variant='outline'
            className='text-green-400 border-green-500/40 px-1.5 py-0.5 bg-green-900/10'>
            <CheckCircle2 className='w-3 h-3 mr-1' />
            Holding
          </Badge>
        ) : (
          <Badge
            variant='secondary'
            className='text-zinc-400 border-zinc-700 px-1.5 py-0.5 bg-zinc-700/20'>
            <MinusCircle className='w-3 h-3 mr-1' /> Sold
          </Badge>
        )}
        <div className='flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  onClick={() => copyToClipboard(wallet.address, 'Wallet Address')}>
                  <Copy className='h-3 w-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Address</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {wallet.purchaseTxSignature && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SolscanButton
                    address={wallet.purchaseTxSignature}
                    type='tx'
                    className='h-6 w-6 p-0 flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded-md cursor-pointer'
                  />
                </TooltipTrigger>
                <TooltipContent>View First Purchase TX</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SolscanButton
                  address={wallet.address}
                  type='account'
                  className='h-6 w-6 p-0 flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded-md cursor-pointer'
                />
              </TooltipTrigger>
              <TooltipContent>View Wallet on Solscan</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export const EarlyBuyersInfo = ({ earlyBuyerInfo, isLoading, className }: EarlyBuyersInfoProps) => {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2'>
          <Users className='w-4 h-4 text-purple-400' />
          Early Buyers Analysis
        </h3>
        <Skeleton className='h-5 w-3/4' />
        <div className='space-y-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    );
  }

  if (!earlyBuyerInfo || earlyBuyerInfo.earlyBuyers.length === 0) {
    return (
      <div className={cn('text-sm text-zinc-500', className)}>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2 mb-2'>
          <Users className='w-4 h-4 text-purple-400' />
          Early Buyers Analysis
        </h3>
        No early buyer data available for this token.
      </div>
    );
  }

  const { totalEarlyBuyersCount, stillHoldingCount, earlyBuyers } = earlyBuyerInfo;
  const holdingPercentage =
    totalEarlyBuyersCount > 0 ? (stillHoldingCount / totalEarlyBuyersCount) * 100 : 0;

  const sortedBuyers = [...earlyBuyers].sort((a, b) => Number(b.isHolding) - Number(a.isHolding));

  return (
    <div className={cn('space-y-3 text-xs', className)}>
      <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2'>
        <Users className='w-4 h-4 text-purple-400' />
        Early Buyers Analysis
      </h3>
      <div className='text-sm font-semibold text-white pl-1'>
        {stillHoldingCount} / {totalEarlyBuyersCount} early buyers still holding (
        {holdingPercentage.toFixed(0)}%)
      </div>
      <div className='space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-1'>
        {sortedBuyers.map((wallet) => (
          <WalletRow key={wallet.address} wallet={wallet} />
        ))}
      </div>
      <div className='pt-3'>
        <div className='w-full h-[1px] bg-gradient-to-r from-zinc-700/20 via-zinc-700/50 to-zinc-700/20'></div>
      </div>
    </div>
  );
};
