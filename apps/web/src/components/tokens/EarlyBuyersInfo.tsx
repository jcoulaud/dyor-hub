'use client';

import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EarlyBuyerInfo, EarlyBuyerWallet } from '@dyor-hub/types';
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  ExternalLink,
  Lock,
  Table as TableIcon,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface EarlyBuyersInfoProps {
  mintAddress: string;
  className?: string;
}

const WalletCard = ({ wallet }: { wallet: EarlyBuyerWallet }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Address Copied',
        description: `${text.substring(0, 4)}...${text.substring(text.length - 4)} copied to clipboard`,
      });
    });
  };

  const formattedAddress = `${wallet.address.substring(0, 4)}...${wallet.address.substring(wallet.address.length - 4)}`;

  return (
    <div className='flex items-center justify-between rounded-md bg-zinc-800/60 px-2.5 py-1.5 border border-zinc-700/50'>
      <div className='flex items-center gap-2'>
        {wallet.isHolding ? (
          <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'>
            Hold
          </span>
        ) : (
          <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-900/30 text-red-400 border border-red-800/30'>
            Sold
          </span>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SolscanButton
                address={wallet.address}
                type='account'
                className='font-mono text-xs text-zinc-200 hover:text-blue-400 transition-colors cursor-pointer'>
                {formattedAddress}
              </SolscanButton>
            </TooltipTrigger>
            <TooltipContent>View Wallet on Solscan</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          onClick={() => copyToClipboard(wallet.address)}
          className='p-0.5 rounded-md hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer'>
          <Copy className='h-3 w-3' />
        </button>
      </div>

      {wallet.purchaseTxSignature && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SolscanButton
                address={wallet.purchaseTxSignature}
                type='tx'
                className='text-zinc-500 hover:text-blue-400 cursor-pointer'>
                <ExternalLink className='h-3.5 w-3.5' />
              </SolscanButton>
            </TooltipTrigger>
            <TooltipContent>View First Purchase Transaction</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

const EarlyBuyersDialog = ({ earlyBuyerInfo }: { earlyBuyerInfo: EarlyBuyerInfo }) => {
  const sortedBuyers = useMemo(
    () => [...earlyBuyerInfo.earlyBuyers].sort((a, b) => Number(b.isHolding) - Number(a.isHolding)),
    [earlyBuyerInfo.earlyBuyers],
  );

  const { totalEarlyBuyersCount, stillHoldingCount } = earlyBuyerInfo;

  return (
    <>
      <DialogHeader className='pb-2'>
        <DialogTitle className='text-zinc-100 flex items-center'>
          <Users className='w-4 h-4 mr-2 text-purple-400' />
          Early Buyers Analysis
        </DialogTitle>
      </DialogHeader>
      <div
        className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 flex-1 mt-2'
        style={{ maxHeight: '65vh' }}>
        <div className='px-1 pb-3'>
          <div className='flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30'>
            <span className='text-zinc-400 text-sm'>Holding Wallets</span>
            <div className='flex items-baseline'>
              <span className='font-semibold text-white'>{stillHoldingCount}</span>
              <span className='text-zinc-400 mx-1'>/</span>
              <span className='font-semibold text-white'>{totalEarlyBuyersCount}</span>
              <span className='text-zinc-400 ml-1'>buyers</span>
            </div>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 px-1 pb-3'>
          {sortedBuyers.map((wallet) => (
            <WalletCard key={wallet.address} wallet={wallet} />
          ))}
        </div>
      </div>
    </>
  );
};

export const EarlyBuyersInfo = ({ mintAddress, className }: EarlyBuyersInfoProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [earlyBuyerData, setEarlyBuyerData] = useState<EarlyBuyerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { toast } = useToast();

  interface TokenGatedErrorData {
    message: string;
    currentBalance: string;
    requiredBalance: string;
  }

  const fetchData = async () => {
    if (!mintAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiTokens.getEarlyBuyerInfo(mintAddress);
      setEarlyBuyerData(data);
      if (!data || data.earlyBuyers.length === 0) {
        toast({
          variant: 'default',
          title: 'No Data',
          description: 'No early buyer data available for this token.',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
        let description = err.message || 'Failed to load early buyer information.';
        let errorTitle = 'Error';

        if (err.status === 403) {
          errorTitle = 'Access Denied';
          const errorDetails = err.data as TokenGatedErrorData | undefined;
          description = errorDetails?.message || `Token gated: Insufficient balance.`;
          if (errorDetails?.currentBalance && errorDetails?.requiredBalance) {
            description += ` You have ${errorDetails.currentBalance}, required ${errorDetails.requiredBalance}.`;
          }
          toast({
            variant: 'destructive',
            title: errorTitle,
            description: description,
          });
        } else if (err.status === 401) {
          errorTitle = 'Authentication Required';
          description = 'Please log in again to access this feature.';
          toast({
            variant: 'destructive',
            title: errorTitle,
            description: description,
          });
        } else {
          errorTitle = `Error ${err.status}`;
          description = err.message || 'An error occurred.';
          toast({
            variant: 'destructive',
            title: errorTitle,
            description: description,
          });
        }
      } else {
        setError(new ApiError(500, 'An unexpected error occurred.'));
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred while fetching early buyer data.',
        });
      }
      setEarlyBuyerData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    setDialogOpen(true);
    if (!earlyBuyerData || error) {
      fetchData();
    }
  };

  const renderInitialButton = () => (
    <Button
      onClick={handleButtonClick}
      variant='outline'
      size='sm'
      disabled={dialogOpen && isLoading}
      className='w-full bg-zinc-900/60 border-zinc-700/50 hover:bg-zinc-800/80 text-zinc-200 flex items-center justify-between'>
      <div className='flex items-center'>
        <TableIcon className='w-4 h-4 mr-2 text-zinc-200' />
        View Early Buyers Analysis
      </div>
      <ChevronRight className='w-4 h-4 ml-auto' />
    </Button>
  );

  const renderDialogContent = () => {
    if (isLoading) {
      return (
        <>
          <DialogHeader className='pb-2 opacity-50'>
            <DialogTitle className='text-zinc-100 flex items-center'>
              <Users className='w-4 h-4 mr-2 text-purple-400' />
              Early Buyers Analysis
            </DialogTitle>
          </DialogHeader>
          <div className='py-10 px-4 text-center space-y-4'>
            <Skeleton className='h-6 w-3/4 mx-auto' />
            <Skeleton className='h-4 w-1/2 mx-auto' />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2 pt-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </>
      );
    }

    if (error) {
      if (error.status === 403) {
        const errorDetails = error.data as TokenGatedErrorData | undefined;
        const requiredBalanceStr = errorDetails?.requiredBalance
          ? parseInt(errorDetails.requiredBalance, 10).toLocaleString()
          : 'the required amount';
        const currentBalanceStr = errorDetails?.currentBalance
          ? parseInt(errorDetails.currentBalance, 10).toLocaleString()
          : 'insufficient';

        return (
          <>
            <DialogHeader className='pb-2'>
              <DialogTitle className='text-zinc-100 flex items-center text-red-400'>
                <Lock className='w-4 h-4 mr-2' />
                Access Denied
              </DialogTitle>
            </DialogHeader>
            <div className='py-6 px-4 text-center text-sm text-zinc-300 space-y-3'>
              <p>
                {errorDetails?.message || 'Access to this feature requires holding more tokens.'}
              </p>
              <p className='font-semibold'>
                Required: {requiredBalanceStr} $DYORHUB <br />
                Your Balance: {currentBalanceStr} $DYORHUB
              </p>
              <p className='text-xs text-zinc-400 pt-2'>
                Please ensure your primary connected wallet holds the required amount.
              </p>
            </div>
          </>
        );
      }
      return (
        <>
          <DialogHeader className='pb-2'>
            <DialogTitle className='text-zinc-100 flex items-center text-red-400'>
              <AlertTriangle className='w-4 h-4 mr-2' />
              Error
            </DialogTitle>
          </DialogHeader>
          <div className='py-6 px-4 text-center text-sm text-zinc-300'>
            <p>
              {error.message || 'Failed to load early buyer information. Please try again later.'}
            </p>
          </div>
        </>
      );
    }

    if (earlyBuyerData && earlyBuyerData.earlyBuyers.length > 0) {
      return <EarlyBuyersDialog earlyBuyerInfo={earlyBuyerData} />;
    }

    return (
      <>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-zinc-100 flex items-center'>
            <Users className='w-4 h-4 mr-2 text-purple-400' />
            Early Buyers Analysis
          </DialogTitle>
        </DialogHeader>
        <div className='py-10 px-4 text-center text-sm text-zinc-400'>
          No early buyer data available for this token.
        </div>
      </>
    );
  };

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2'>
          <Users className='w-4 h-4 text-purple-400' />
          Early Buyers Analysis
        </h3>
        {renderInitialButton()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-xl bg-zinc-900/95 border-zinc-700'>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};
