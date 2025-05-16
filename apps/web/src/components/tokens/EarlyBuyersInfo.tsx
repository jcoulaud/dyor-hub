'use client';

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EarlyBuyerInfo, EarlyBuyerWallet, TokenGatedErrorData } from '@dyor-hub/types';
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
        <span className='text-xs font-semibold text-zinc-400 mr-1'>#{wallet.rank}</span>
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
    () =>
      [...earlyBuyerInfo.earlyBuyers].sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }
        return Number(b.isHolding) - Number(a.isHolding);
      }),
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
        let errorTitle = 'Error';
        let description = 'An unknown error occurred.';
        const toastVariant: 'default' | 'destructive' = 'destructive';

        const errorData = err.data as Partial<TokenGatedErrorData> | string | undefined;
        const messageFromServer =
          typeof errorData === 'object' && errorData?.message
            ? errorData.message
            : typeof errorData === 'string'
              ? errorData
              : err.message;

        if (err.status !== 403) {
          if (err.status === 401) {
            errorTitle = 'Authentication Required';
            description = messageFromServer || 'Please log in again to access this feature.';
          } else {
            errorTitle = `Error ${err.status}`;
            description = messageFromServer || 'An error occurred.';
          }
          toast({
            variant: toastVariant,
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
      size='lg'
      disabled={dialogOpen && isLoading}
      className='w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-purple-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg'>
      <div className='flex items-center'>
        <div className='w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center mr-3'>
          <TableIcon className='w-5 h-5 text-purple-100' />
        </div>
        <span className='font-semibold'>Early Buyers Analysis</span>
      </div>
      <ChevronRight className='w-5 h-5 text-purple-400' />
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
        return (
          <>
            <DialogHeader className='pb-2'>
              <DialogTitle className='text-zinc-100 flex items-center text-orange-400'>
                <Lock className='w-4 h-4 mr-2' />
                Access Gated
              </DialogTitle>
            </DialogHeader>
            <TokenGatedMessage error={error} featureName='Early Buyers Analysis' />
          </>
        );
      }
      const errorData = error.data as Partial<TokenGatedErrorData> | string | undefined;
      const messageFromServer =
        typeof errorData === 'object' && errorData?.message
          ? errorData.message
          : typeof errorData === 'string'
            ? errorData
            : error.message;
      return (
        <>
          <DialogHeader className='pb-2'>
            <DialogTitle className='text-zinc-100 flex items-center text-red-400'>
              <AlertTriangle className='w-4 h-4 mr-2' />
              Error {error.status || ''}
            </DialogTitle>
          </DialogHeader>
          <div className='py-6 px-4 text-center text-sm text-zinc-300'>
            <p>{messageFromServer || 'Failed to load information. Please try again later.'}</p>
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
      <div className={cn(className)}>{renderInitialButton()}</div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-xl bg-zinc-900/95 border-zinc-700'>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};
