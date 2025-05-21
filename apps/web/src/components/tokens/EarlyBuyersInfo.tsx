'use client';

const formatTokenAmount = {
  format: (amount: number | null | undefined, symbol?: string) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `${amount.toLocaleString()} ${symbol || ''}`.trim();
  },
};

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { DYORHUB_SYMBOL, MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { EarlyBuyerInfo, EarlyBuyerWallet, TokenGatedErrorData } from '@dyor-hub/types';
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface EarlyBuyersInfoProps {
  mintAddress: string;
  className?: string;
  userPlatformTokenBalance?: number;
}

const WalletCard = ({ wallet }: { wallet: EarlyBuyerWallet }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Address Copied',
        description: `${text.substring(0, 4)}...${text.substring(
          text.length - 4,
        )} copied to clipboard`,
      });
    });
  };

  const formattedAddress = `${wallet.address.substring(
    0,
    4,
  )}...${wallet.address.substring(wallet.address.length - 4)}`;

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

const EarlyBuyersDialogDisplay = ({
  earlyBuyerInfo,
  isLoading,
}: {
  earlyBuyerInfo: EarlyBuyerInfo | null;
  isLoading?: boolean;
}) => {
  if (isLoading || (!earlyBuyerInfo && isLoading !== false)) {
    return (
      <div className='flex flex-col items-center justify-center py-8'>
        <Loader2 className='h-12 w-12 animate-spin text-purple-400' />
        <p className='mt-4 text-zinc-300'>Analyzing early buyers, please wait...</p>
      </div>
    );
  }

  if (!earlyBuyerInfo || earlyBuyerInfo.earlyBuyers.length === 0) {
    return (
      <>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-zinc-100 flex items-center'>
            <Users className='w-5 h-5 mr-2 text-purple-400' />
            Early Buyers Analysis
          </DialogTitle>
        </DialogHeader>
        <div className='p-6 flex flex-col items-center justify-center text-center'>
          <Users className='w-12 h-12 text-purple-400 mb-4' />
          <h3 className='text-lg font-semibold text-zinc-100 mb-2'>No Early Buyers Found</h3>
          <p className='text-sm text-zinc-400'>No early buyer data is available for this token.</p>
        </div>
      </>
    );
  }

  const sortedBuyers = [...earlyBuyerInfo.earlyBuyers].sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return Number(b.isHolding) - Number(a.isHolding);
  });

  const { totalEarlyBuyersCount, stillHoldingCount } = earlyBuyerInfo;

  return (
    <>
      <DialogHeader className='pb-2'>
        <DialogTitle className='text-zinc-100 flex items-center'>
          <Users className='w-5 h-5 mr-2 text-purple-400' />
          Early Buyers Analysis
        </DialogTitle>
      </DialogHeader>
      <div
        className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 max-h-[calc(100vh-20rem)]'
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

        <div className='mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-500 px-1'>
          <Info size={12} className='inline-block mr-1.5 relative -top-px text-zinc-400' />
          Early buyer data is for informational purposes only and not financial advice. Always do
          your own research (DYOR).
        </div>
      </div>
      <DialogFooter className='mt-6'>
        <DialogClose asChild>
          <Button className='bg-purple-600 hover:bg-purple-700 text-white ml-auto'>
            <Users className='h-4 w-4 mr-2' />
            Done
          </Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
};

const InsufficientCreditsContent = ({
  onClose,
  requiredCredits,
}: {
  onClose: () => void;
  requiredCredits: number;
}) => (
  <>
    <DialogHeader className='pb-2'>
      <DialogTitle className='text-zinc-100 flex items-center gap-2'>
        <AlertTriangle className='w-5 h-5 text-amber-400' />
        Insufficient Credits
      </DialogTitle>
    </DialogHeader>
    <div className='p-6 space-y-4'>
      <p className='text-zinc-300'>
        You need {requiredCredits} credit{requiredCredits !== 1 ? 's' : ''} to perform this
        analysis, but you don&apos;t have enough. Purchase more credits to continue.
      </p>
      <div className='flex gap-3'>
        <Button
          className='flex-1 bg-zinc-800 hover:bg-zinc-700'
          variant='outline'
          onClick={onClose}>
          Cancel
        </Button>
        <Button
          className='flex-1 bg-teal-500 hover:bg-teal-600'
          onClick={() => {
            onClose();
            window.location.href = '/account/credits';
          }}>
          Get Credits
        </Button>
      </div>
    </div>
  </>
);

export const EarlyBuyersInfo = ({
  mintAddress,
  className,
  userPlatformTokenBalance,
}: EarlyBuyersInfoProps) => {
  const { isAuthenticated, user, checkAuth, isLoading: authLoading } = useAuthContext();
  const [earlyBuyerInfo, setEarlyBuyerInfo] = useState<EarlyBuyerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorData, setErrorData] = useState<TokenGatedErrorData | null>(null);
  const { toast } = useToast();

  const isTokenHolder =
    isAuthenticated &&
    userPlatformTokenBalance !== undefined &&
    userPlatformTokenBalance >= MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS;

  const fetchData = async (attemptUseCredits = false) => {
    if (!isAuthenticated || !user) {
      setError('You must be logged in to view Early Buyers Analysis');
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to view Early Buyers Analysis',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorData(null);

    try {
      const data = await apiTokens.getEarlyBuyerInfo(mintAddress, attemptUseCredits);
      setEarlyBuyerInfo(data);
    } catch (err) {
      const caughtError = err as ApiError;
      console.error('Failed to fetch early buyers:', caughtError);

      if (caughtError.status === 401) {
        await checkAuth(true);
        toast({
          title: 'Authentication Error',
          description: 'Your session may have expired. Please log in again.',
          variant: 'destructive',
        });
        setError('Authentication required. Please log in again.');
      } else if (caughtError.status === 402) {
        setErrorData({
          message: caughtError.message || 'Insufficient credits for Early Buyers Analysis.',
          requiredCredits: 1,
          isTokenGated: true,
        });
        setError(caughtError.message || 'Insufficient credits for Early Buyers Analysis.');
      } else if ((caughtError.data as TokenGatedErrorData)?.isTokenGated) {
        setErrorData(caughtError.data as TokenGatedErrorData);
        setError(caughtError.message || 'An error occurred.');
      } else {
        setError(caughtError.message || 'An error occurred.');
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: caughtError.message || 'Could not fetch early buyer information.',
        });
      }
      setEarlyBuyerInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = async () => {
    if (!isAuthenticated) {
      await checkAuth(true);
      if (!isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view Early Buyers Analysis.',
          variant: 'destructive',
        });
        return;
      }
    }
    setEarlyBuyerInfo(null);
    setError(null);
    setErrorData(null);
    setIsLoading(false);
    setIsDialogOpen(true);
  };

  const handleConfirmAnalysis = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    if (isTokenHolder) {
      fetchData(false);
    } else {
      fetchData(true);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEarlyBuyerInfo(null);
    setError(null);
    setErrorData(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleDialogClose();
    }
    setIsDialogOpen(open);
  };

  if (!isAuthenticated && error && errorData?.message?.includes('Please log in')) {
    return (
      <div className={cn('rounded-lg border border-zinc-700/80 p-4 bg-zinc-900/50', className)}>
        <TokenGatedMessage
          error={
            new ApiError(401, errorData?.message || 'Please log in to view Early Buyers Analysis.')
          }
          featureName='Early Buyers Analysis'
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              variant='outline'
              size='lg'
              className={cn(
                'w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-purple-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg',
                className,
              )}
              disabled={isLoading || authLoading}>
              {isLoading || authLoading ? (
                <>
                  <div className='flex items-center'>
                    <div className='w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center mr-3'>
                      <Loader2 className='w-5 h-5 text-purple-100 animate-spin' />
                    </div>
                    <span className='font-semibold'>
                      {authLoading ? 'Authenticating...' : 'Analyzing...'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className='flex items-center'>
                    <div className='w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center mr-3'>
                      <Users className='w-5 h-5 text-purple-100' />
                    </div>
                    <span className='font-semibold'>Early Buyers Analysis</span>
                  </div>
                  <ChevronRight className='w-5 h-5 text-purple-400' />
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side='top'
            align='center'
            className='bg-zinc-800 text-zinc-200 border-zinc-700 shadow-lg text-xs px-3 py-1.5 rounded-md'>
            <p>
              Analyze the wallets that bought this token early.
              <br />
              {isTokenHolder
                ? `Free for ${DYORHUB_SYMBOL} token holders.`
                : 'Costs 1 credit per analysis.'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className='max-w-4xl bg-zinc-900/95 border-zinc-700/50 backdrop-blur-md text-zinc-50 data-[state=open]:animate-contentShow'>
          {errorData?.requiredCredits ? (
            <InsufficientCreditsContent
              onClose={handleDialogClose}
              requiredCredits={errorData.requiredCredits}
            />
          ) : earlyBuyerInfo ? (
            <EarlyBuyersDialogDisplay earlyBuyerInfo={earlyBuyerInfo} isLoading={isLoading} />
          ) : (
            <>
              <DialogHeader className='pb-2'>
                <DialogTitle className='text-zinc-100 flex items-center'>
                  <Users className='w-5 h-5 mr-2 text-purple-400' />
                  Early Buyers Analysis
                </DialogTitle>
                {!isLoading && (
                  <DialogDescription className='text-sm text-zinc-400 pt-1'>
                    Discover who bought the token early. This can provide insights into potential
                    whales or informed traders.
                    {isLoading ? (
                      <span className='block mt-2 text-zinc-400 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin inline mr-1.5' />
                        Loading user data...
                      </span>
                    ) : !isAuthenticated ? (
                      <div className='text-amber-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`Log in and hold ${formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS, DYORHUB_SYMBOL)} for free analysis.`}
                      </div>
                    ) : isTokenHolder ? (
                      <div className='text-emerald-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`This analysis is FREE for you! (You hold ${formatTokenAmount.format(userPlatformTokenBalance)}/${formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS)} required ${DYORHUB_SYMBOL})`}
                      </div>
                    ) : isAuthenticated && typeof userPlatformTokenBalance === 'undefined' ? (
                      <span className='block mt-2 text-zinc-400 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin inline mr-1.5' />
                        Loading token balance...
                      </span>
                    ) : (
                      <div className='text-amber-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`Hold ${formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS, DYORHUB_SYMBOL)} for free analysis. Your balance: ${formatTokenAmount.format(userPlatformTokenBalance, DYORHUB_SYMBOL)}.`}
                      </div>
                    )}
                  </DialogDescription>
                )}
              </DialogHeader>

              {error && !errorData && (
                <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex items-center'>
                  <AlertTriangle className='h-5 w-5 mr-2' />
                  {error}
                </div>
              )}

              {isLoading && !earlyBuyerInfo && (
                <div className='flex flex-col items-center justify-center py-8'>
                  <Loader2 className='h-12 w-12 animate-spin text-purple-400' />
                  <p className='mt-4 text-zinc-300'>Analyzing early buyers, please wait...</p>
                </div>
              )}

              {!isLoading && !earlyBuyerInfo && (
                <DialogFooter className='mt-6'>
                  <Button
                    onClick={handleConfirmAnalysis}
                    disabled={isLoading || authLoading || !isAuthenticated}
                    className='bg-purple-600 hover:bg-purple-700 text-white ml-auto'>
                    {isLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                      <Users className='h-4 w-4 mr-2' />
                    )}
                    {isLoading
                      ? 'Analyzing...'
                      : isTokenHolder
                        ? 'Analyze (Free)'
                        : 'Analyze (1 Credit)'}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
