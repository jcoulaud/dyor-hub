'use client';

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
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { DYORHUB_SYMBOL, MIN_TOKEN_HOLDING_FOR_TOP_TRADERS } from '@/lib/constants';
import { cn, formatCurrency, formatTokenAmount } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { TokenGatedErrorData, TopTrader, TopTradersResponse } from '@dyor-hub/types';
import { AlertTriangle, ChevronRight, Copy, Info, Loader2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TopTradersAnalysisInfoProps {
  mintAddress: string;
  className?: string;
  userPlatformTokenBalance?: number;
}

const TraderCard = ({ trader, rank }: { trader: TopTrader; rank: number }) => {
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

  const formattedAddress = `${trader.wallet.substring(
    0,
    6,
  )}...${trader.wallet.substring(trader.wallet.length - 4)}`;

  const getPnLColor = (value?: number) => {
    if (!value) return 'text-zinc-400';
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const getRoiPercentage = (realized: number, invested: number) => {
    if (!invested || invested === 0) return '0%';
    const percentage = (realized / invested) * 100;
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(0)}%`;
  };

  const isHolding = trader.holding > 0;

  return (
    <div className='relative bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-3 hover:border-orange-400/60 hover:bg-zinc-800/80 transition-all duration-200 group'>
      {/* Rank */}
      <div className='flex items-center justify-between mb-2'>
        <span className='text-xs font-bold text-orange-400'>#{rank}</span>
        <div
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isHolding ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
          }`}>
          {isHolding ? 'HODL' : 'SOLD'}
        </div>
      </div>

      {/* Wallet Address */}
      <div className='relative mb-3'>
        <SolscanButton
          address={trader.wallet}
          type='account'
          className='font-mono text-xs text-zinc-300 hover:text-orange-400 transition-colors w-full text-center cursor-pointer block'>
          {formattedAddress}
        </SolscanButton>

        <button
          onClick={() => copyToClipboard(trader.wallet)}
          className='absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer'>
          <Copy className='h-3 w-3' />
        </button>
      </div>

      {/* Main Stats */}
      <div className='space-y-2'>
        {/* Realized PnL - Most prominent */}
        <div className='text-center py-2 bg-zinc-800/50 rounded border border-zinc-700/30'>
          <div className='text-[10px] text-zinc-500 uppercase tracking-wide mb-1'>Realized PnL</div>
          <div className={`text-sm font-bold ${getPnLColor(trader.realized)}`}>
            {formatCurrency(trader.realized)}
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className='grid grid-cols-3 gap-1 text-xs'>
          <div className='text-center py-1.5 bg-zinc-800/30 rounded'>
            <div className='text-[9px] text-zinc-500 mb-0.5'>Invested</div>
            <div className='text-zinc-300 font-medium'>{formatCurrency(trader.total_invested)}</div>
          </div>

          <div className='text-center py-1.5 bg-zinc-800/30 rounded'>
            <div className='text-[9px] text-zinc-500 mb-0.5'>Unrealized</div>
            <div className={`font-medium ${getPnLColor(trader.unrealized)}`}>
              {formatCurrency(trader.unrealized)}
            </div>
          </div>

          <div className='text-center py-1.5 bg-zinc-800/30 rounded'>
            <div className='text-[9px] text-zinc-500 mb-0.5'>ROI</div>
            <div className={`font-medium ${getPnLColor(trader.realized)}`}>
              {getRoiPercentage(trader.realized, trader.total_invested)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TopTradersDialogDisplay = ({
  topTradersData,
  isLoading,
}: {
  topTradersData: TopTradersResponse | null;
  isLoading?: boolean;
}) => {
  if (isLoading || (!topTradersData && isLoading !== false)) {
    return (
      <div className='flex flex-col items-center justify-center py-8'>
        <Loader2 className='h-12 w-12 animate-spin text-orange-400' />
        <p className='mt-4 text-zinc-300'>Analyzing top traders, please wait...</p>
      </div>
    );
  }

  if (!topTradersData || topTradersData.traders.length === 0) {
    return (
      <>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-zinc-100 flex items-center'>
            <TrendingUp className='w-5 h-5 mr-2 text-orange-400' />
            Top Traders Analysis
          </DialogTitle>
        </DialogHeader>
        <div className='p-6 flex flex-col items-center justify-center text-center'>
          <TrendingUp className='w-12 h-12 text-orange-400 mb-4' />
          <h3 className='text-lg font-semibold text-zinc-100 mb-2'>No Top Traders Found</h3>
          <p className='text-sm text-zinc-400'>
            {topTradersData
              ? "This token doesn't have sufficient trading data for top trader analysis yet."
              : 'No top trader data is available for this token.'}
          </p>
        </div>
      </>
    );
  }

  const { traders } = topTradersData;

  return (
    <>
      <DialogHeader className='pb-2'>
        <DialogTitle className='text-zinc-100 flex items-center'>
          <TrendingUp className='w-5 h-5 mr-2 text-orange-400' />
          Top Traders Analysis
        </DialogTitle>
      </DialogHeader>
      <div
        className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 max-h-[calc(100vh-20rem)]'
        style={{ maxHeight: '65vh' }}>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-1'>
          {traders.map((trader, index) => (
            <TraderCard key={trader.wallet} trader={trader} rank={index + 1} />
          ))}
        </div>
      </div>
      <DialogFooter className='mt-6'>
        <DialogClose asChild>
          <Button className='bg-orange-600 hover:bg-orange-700 text-white ml-auto'>
            <TrendingUp className='h-4 w-4 mr-2' />
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

export const TopTradersAnalysisInfo = ({
  mintAddress,
  className,
  userPlatformTokenBalance,
}: TopTradersAnalysisInfoProps) => {
  const { isAuthenticated, user } = useAuthContext();
  const [topTradersData, setTopTradersData] = useState<TopTradersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorData, setErrorData] = useState<TokenGatedErrorData | null>(null);
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const [isLoadingCost, setIsLoadingCost] = useState(false);
  const { toast } = useToast();

  const isTokenHolder =
    isAuthenticated &&
    userPlatformTokenBalance !== undefined &&
    userPlatformTokenBalance >= MIN_TOKEN_HOLDING_FOR_TOP_TRADERS;

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setErrorData(null);

    try {
      const data = await apiTokens.getTopTraders(mintAddress);
      setTopTradersData(data);
    } catch (err) {
      const caughtError = err as ApiError;
      console.error('Failed to fetch top traders:', caughtError);

      if (
        caughtError.status === 403 &&
        (caughtError.message?.toLowerCase().includes('insufficient credits') ||
          (typeof caughtError.data === 'object' &&
            caughtError.data &&
            'requiredCredits' in caughtError.data))
      ) {
        const errorData = caughtError.data as { requiredCredits?: number } | undefined;
        const requiredCredits = errorData?.requiredCredits || creditCost || 3;

        setErrorData({
          message: 'Insufficient credits for Top Traders Analysis.',
          requiredCredits,
          isTokenGated: true,
        });
        setError('Insufficient credits for Top Traders Analysis.');
      } else {
        setError(caughtError.message || 'An error occurred.');
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: caughtError.message || 'Could not fetch top trader information.',
        });
      }
      setTopTradersData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCost = async () => {
    setIsLoadingCost(true);
    try {
      const costData = await apiTokens.getTopTradersCost(mintAddress);
      setCreditCost(costData.cost);
    } catch (err) {
      console.error('Failed to fetch top traders cost:', err);
      setCreditCost(3); // fallback to default cost
    } finally {
      setIsLoadingCost(false);
    }
  };

  useEffect(() => {
    if (isDialogOpen && creditCost === null) {
      fetchCost();
    }
  }, [isDialogOpen, creditCost, mintAddress]);

  const handleOpenDialog = async () => {
    if (!isAuthenticated) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You need to be logged in to access the Top Traders Analysis feature.',
      });
      return;
    }

    setTopTradersData(null);
    setError(null);
    setErrorData(null);
    setIsLoading(false);
    setIsDialogOpen(true);
  };

  const handleConfirmAnalysis = async () => {
    if (!isAuthenticated || !user) {
      setError('Authentication required');
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You need to be logged in to perform this analysis.',
      });
      return;
    }
    fetchData();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setTopTradersData(null);
    setError(null);
    setErrorData(null);
    setCreditCost(null);
    setIsLoadingCost(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleDialogClose();
    }
    setIsDialogOpen(open);
  };

  return (
    <div className={className}>
      <Button
        onClick={handleOpenDialog}
        variant='outline'
        size='lg'
        className={cn(
          'w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-orange-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg',
          className,
        )}
        disabled={isLoading}>
        {isLoading ? (
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center mr-3'>
              <Loader2 className='w-5 h-5 text-orange-100 animate-spin' />
            </div>
            <span className='font-semibold'>Analyzing...</span>
          </div>
        ) : (
          <>
            <div className='flex items-center'>
              <div className='w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center mr-3'>
                <TrendingUp className='w-5 h-5 text-orange-100' />
              </div>
              <span className='font-semibold'>Top Traders Analysis</span>
            </div>
            <ChevronRight className='w-5 h-5 text-orange-400' />
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className='max-w-5xl bg-zinc-900/95 border-zinc-700/50 backdrop-blur-md text-zinc-50 data-[state=open]:animate-contentShow'>
          {errorData?.requiredCredits ? (
            <InsufficientCreditsContent
              onClose={handleDialogClose}
              requiredCredits={errorData.requiredCredits}
            />
          ) : topTradersData ? (
            <TopTradersDialogDisplay topTradersData={topTradersData} isLoading={isLoading} />
          ) : (
            <>
              <DialogHeader className='pb-2'>
                <DialogTitle className='text-zinc-100 flex items-center'>
                  <TrendingUp className='w-5 h-5 mr-2 text-orange-400' />
                  Top Traders Analysis
                </DialogTitle>
                {!isLoading && (
                  <>
                    <DialogDescription className='text-sm text-zinc-400 pt-1'>
                      Discover the top 100 traders by PnL for this token. This provides insights
                      into the most successful traders and their strategies.
                    </DialogDescription>
                    {isTokenHolder ? (
                      <div className='text-emerald-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`Free access with ${formatTokenAmount(MIN_TOKEN_HOLDING_FOR_TOP_TRADERS, DYORHUB_SYMBOL)}!`}
                      </div>
                    ) : (
                      <div className='text-orange-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {isLoadingCost ? (
                          <>
                            <Loader2 className='h-3 w-3 animate-spin mr-1' />
                            Loading cost...
                          </>
                        ) : (
                          `Costs ${creditCost?.toLocaleString()} credits or hold ${formatTokenAmount(MIN_TOKEN_HOLDING_FOR_TOP_TRADERS, DYORHUB_SYMBOL)} for free access.`
                        )}
                      </div>
                    )}
                  </>
                )}
              </DialogHeader>

              {error && !errorData && (
                <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex items-center'>
                  <AlertTriangle className='h-5 w-5 mr-2' />
                  {error}
                </div>
              )}

              {isLoading && !topTradersData && (
                <div className='flex flex-col items-center justify-center py-8'>
                  <Loader2 className='h-12 w-12 animate-spin text-orange-400' />
                  <p className='mt-4 text-zinc-300'>Analyzing top traders, please wait...</p>
                </div>
              )}

              {!isLoading && !topTradersData && (
                <DialogFooter className='mt-6'>
                  <Button
                    onClick={handleConfirmAnalysis}
                    disabled={isLoading}
                    className='bg-orange-600 hover:bg-orange-700 text-white ml-auto'>
                    {isLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                      <TrendingUp className='h-4 w-4 mr-2' />
                    )}
                    {isLoading
                      ? 'Analyzing...'
                      : isTokenHolder
                        ? 'Analyze (Free)'
                        : `Analyze (${creditCost || 3} Credit${(creditCost || 3) !== 1 ? 's' : ''})`}
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
