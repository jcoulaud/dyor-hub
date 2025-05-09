'use client';

import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TrackedWalletHolderStats, TrackedWalletPurchaseRound } from '@dyor-hub/types';
import { AlertTriangle, ChevronRight, Copy, LineChart } from 'lucide-react';
import { useState } from 'react';

interface TokenHolderAnalysisInfoProps {
  mintAddress: string;
  className?: string;
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

interface PurchaseRoundDetailProps {
  round: TrackedWalletPurchaseRound;
  tokenTotalSupply?: number;
}

const PurchaseRoundDetail = ({ round, tokenTotalSupply }: PurchaseRoundDetailProps) => {
  const roundAvgBuyMarketCap = round.averageBuyPriceUsd * (tokenTotalSupply || 0);

  return (
    <div className='mt-1 p-2 rounded bg-zinc-700/30 border border-zinc-600/50 text-xs'>
      <p className='font-semibold mb-1 flex justify-between'>
        <span>
          Round {round.roundId} ({round.soldEverythingFromRound ? 'Sold' : 'Active'})
        </span>
        {round.realizedPnlUsd !== undefined && (
          <span className={round.realizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            PNL: ${round.realizedPnlUsd.toFixed(2)}
          </span>
        )}
      </p>
      <div className='grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-400'>
        <span className='text-zinc-500'>Start:</span>{' '}
        <span>{formatTimestamp(round.startTime)}</span>
        <span className='text-zinc-500'>End:</span>{' '}
        <span>{round.endTime ? formatTimestamp(round.endTime) : 'Ongoing'}</span>
        <span className='text-zinc-500'>Duration:</span>{' '}
        <span>
          {round.holdingDurationSeconds ? formatDuration(round.holdingDurationSeconds) : '-'}
        </span>
        {tokenTotalSupply && round.averageBuyPriceUsd > 0 ? (
          <>
            <span className='text-zinc-500'>Avg Buy MCAP:</span>
            <span>
              ~${roundAvgBuyMarketCap.toLocaleString()} (Price: $
              {round.averageBuyPriceUsd.toFixed(4)})
            </span>
          </>
        ) : (
          <>
            <span className='text-zinc-500'>Avg Buy Price:</span>
            <span>${round.averageBuyPriceUsd.toFixed(4)}</span>
          </>
        )}
        <span className='text-zinc-500'>Total Bought:</span>{' '}
        <span>{round.totalTokensBoughtUi.toLocaleString()}</span>
        <span className='text-zinc-500'>Total Spent:</span>{' '}
        <span>${round.totalUsdSpent.toFixed(2)}</span>
        <span className='text-zinc-500'>Sold Amount:</span>{' '}
        <span>{round.soldAmountUi.toLocaleString()}</span>
      </div>
      {round.firstPurchaseInRound && (
        <details className='mt-1.5 text-zinc-500'>
          <summary className='cursor-pointer text-xs hover:text-zinc-400'>
            First purchase this round
          </summary>
          <div className='pl-2 mt-0.5 border-l border-zinc-600'>
            <p>Price: ${round.firstPurchaseInRound.priceUsd.toFixed(4)}</p>
            {round.firstPurchaseInRound.approxMarketCapAtPurchaseUsd !== undefined && (
              <p>
                Approx MCAP: $
                {round.firstPurchaseInRound.approxMarketCapAtPurchaseUsd.toLocaleString()}
              </p>
            )}
            <p>Amount: {round.firstPurchaseInRound.tokenAmountUi.toLocaleString()}</p>
            <p>Time: {formatTimestamp(round.firstPurchaseInRound.timestamp)}</p>
          </div>
        </details>
      )}
      {round.subsequentPurchasesInRound.length > 0 && (
        <details className='mt-1 text-zinc-500'>
          <summary className='cursor-pointer text-xs hover:text-zinc-400'>
            Subsequent purchases ({round.subsequentPurchasesInRound.length})
          </summary>
          <div className='pl-2 mt-0.5 border-l border-zinc-600 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600'>
            {round.subsequentPurchasesInRound.map((p, idx) => (
              <div key={idx} className='text-xs'>
                <span>
                  ${p.priceUsd.toFixed(4)} (Amt: {p.tokenAmountUi.toLocaleString()}) @{' '}
                  {formatTimestamp(p.timestamp)}
                </span>
                {p.approxMarketCapAtPurchaseUsd !== undefined && (
                  <span className='ml-1 text-zinc-600'>
                    MCAP: ~${p.approxMarketCapAtPurchaseUsd.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

const WalletHolderStatsDisplay = ({ stats }: { stats: TrackedWalletHolderStats }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Address Copied',
        description: `${text.substring(0, 6)}...${text.substring(text.length - 4)} copied to clipboard`,
      });
    });
  };

  const formattedAddress = `${stats.walletAddress.substring(0, 6)}...${stats.walletAddress.substring(stats.walletAddress.length - 4)}`;
  const overallAvgBuyMarketCap =
    stats.overallAverageBuyPriceUsd * (stats.analyzedTokenTotalSupply || 0);

  return (
    <div className='p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/60 mb-3'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SolscanButton
                  address={stats.walletAddress}
                  type='account'
                  className='font-mono text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer'>
                  {formattedAddress}
                </SolscanButton>
              </TooltipTrigger>
              <TooltipContent>View Wallet on Solscan</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={() => copyToClipboard(stats.walletAddress)}
            className='p-1 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors'>
            <Copy className='h-3.5 w-3.5' />
          </button>
        </div>
        <span className='text-xs text-zinc-400'>
          Holding: {stats.percentageOfTotalSupply?.toFixed(2) ?? 'N/A'}%
        </span>
      </div>
      <div className='text-xs space-y-1 text-zinc-300'>
        <p>Current Balance: {stats.currentBalanceUi.toLocaleString()} tokens</p>
        {stats.analyzedTokenTotalSupply && stats.overallAverageBuyPriceUsd > 0 ? (
          <p>
            Overall Avg. Buy MCAP: ~${overallAvgBuyMarketCap.toLocaleString()} (Price: $
            {stats.overallAverageBuyPriceUsd.toFixed(4)})
          </p>
        ) : (
          <p>Overall Avg. Buy Price: ${stats.overallAverageBuyPriceUsd.toFixed(4)}</p>
        )}
        {stats.firstEverPurchase ? (
          <div className='text-xs'>
            {stats.firstEverPurchase.approxMarketCapAtPurchaseUsd !== undefined ? (
              <p>
                First Ever Buy MCAP: ~$
                {stats.firstEverPurchase.approxMarketCapAtPurchaseUsd.toLocaleString()}
                (Price: ${stats.firstEverPurchase.priceUsd.toFixed(4)}) on{' '}
                {formatTimestamp(stats.firstEverPurchase.timestamp)}
              </p>
            ) : (
              <p>
                First Ever Buy: ${stats.firstEverPurchase.priceUsd.toFixed(4)} on{' '}
                {formatTimestamp(stats.firstEverPurchase.timestamp)}
              </p>
            )}
          </div>
        ) : (
          <p>First Ever Buy: N/A (No buy trades found)</p>
        )}
        {stats.totalUsdValueOfSales !== undefined && (
          <p>Total USD from Sales: ${stats.totalUsdValueOfSales.toFixed(2)}</p>
        )}
        {stats.overallRealizedPnlUsd !== undefined && (
          <p>
            Overall Realized PNL:{' '}
            <span
              className={stats.overallRealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              ${stats.overallRealizedPnlUsd.toFixed(2)}
            </span>
          </p>
        )}
        {stats.lastSellOffTimestamp && (
          <p>Last Full Sell-off: {formatTimestamp(stats.lastSellOffTimestamp)}</p>
        )}
        <p>
          Current Holding Duration:{' '}
          {stats.currentHoldingDurationSeconds && stats.currentHoldingDurationSeconds > 0
            ? formatDuration(stats.currentHoldingDurationSeconds)
            : 'N/A'}
        </p>

        {stats.purchaseRounds.length > 0 && (
          <div className='mt-2 pt-2 border-t border-zinc-700/50'>
            <h4 className='text-xs font-semibold text-zinc-200 mb-1.5'>
              Purchase Rounds ({stats.purchaseRounds.length}):
            </h4>
            <div className='space-y-2'>
              {stats.purchaseRounds.map((round) => (
                <PurchaseRoundDetail
                  key={round.roundId}
                  round={round}
                  tokenTotalSupply={stats.analyzedTokenTotalSupply}
                />
              ))}
            </div>
          </div>
        )}
        {stats.purchaseRounds.length === 0 && !stats.firstEverPurchase && (
          <p className='text-zinc-500 italic mt-1 text-center'>
            No specific purchase rounds identified from swap trades.
          </p>
        )}
      </div>
    </div>
  );
};

const HolderAnalysisDialogContent = ({
  analysisData,
}: {
  analysisData: TrackedWalletHolderStats[];
}) => (
  <>
    <DialogHeader className='pb-2'>
      <DialogTitle className='text-zinc-100 flex items-center'>
        <LineChart className='w-4 h-4 mr-2 text-teal-400' />
        Diamond Hands Analysis
      </DialogTitle>
    </DialogHeader>
    <div
      className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 flex-1 mt-2'
      style={{ maxHeight: '65vh' }}>
      <div className='px-1 pb-3 space-y-2'>
        {analysisData.length > 0 ? (
          analysisData.map((stats) => (
            <WalletHolderStatsDisplay key={stats.walletAddress} stats={stats} />
          ))
        ) : (
          <p className='text-center text-zinc-400 py-4'>No holder analysis data available.</p>
        )}
      </div>
    </div>
  </>
);

export const TokenHolderAnalysisInfo = ({
  mintAddress,
  className,
}: TokenHolderAnalysisInfoProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<TrackedWalletHolderStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!mintAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiTokens.getTokenHolderAnalysis(mintAddress);
      setAnalysisData(data);
      if (!data || data.length === 0) {
        toast({
          variant: 'default',
          title: 'No Data',
          description: 'No holder analysis data available for this token.',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
        toast({
          variant: 'destructive',
          title: `Error ${err.status || ''}`,
          description: err.message || 'An error occurred while fetching holder analysis.',
        });
      } else if (err instanceof Error) {
        setError(new ApiError(500, err.message || 'An unexpected error occurred.'));
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'An unexpected error occurred.',
        });
      } else {
        setError(new ApiError(500, 'An unexpected error occurred.'));
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.',
        });
      }
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    setDialogOpen(true);
    if (!analysisData || error) {
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
        <LineChart className='w-4 h-4 mr-2 text-zinc-200' />
        View Diamond Hands Analysis
      </div>
      <ChevronRight className='w-4 h-4 ml-auto' />
    </Button>
  );

  const renderDialogView = () => {
    if (isLoading) {
      return (
        <>
          <DialogHeader className='pb-2 opacity-50'>
            <DialogTitle className='text-zinc-100 flex items-center'>
              <LineChart className='w-4 h-4 mr-2 text-teal-400' />
              Diamond Hands Analysis
            </DialogTitle>
          </DialogHeader>
          <div className='py-10 px-4 text-center space-y-4'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-5 w-1/2 mx-auto' />
                <Skeleton className='h-3 w-3/4 mx-auto' />
                <Skeleton className='h-3 w-2/3 mx-auto' />
              </div>
            ))}
          </div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <DialogHeader className='pb-2'>
            <DialogTitle className='text-zinc-100 flex items-center text-red-400'>
              <AlertTriangle className='w-4 h-4 mr-2' />
              Error {error.status || ''}
            </DialogTitle>
          </DialogHeader>
          <div className='py-6 px-4 text-center text-sm text-zinc-300'>
            <p>{error.message || 'Failed to load information. Please try again later.'}</p>
          </div>
        </>
      );
    }

    if (analysisData) {
      return <HolderAnalysisDialogContent analysisData={analysisData} />;
    }

    return (
      <>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-zinc-100 flex items-center'>
            <LineChart className='w-4 h-4 mr-2 text-teal-400' />
            Diamond Hands Analysis
          </DialogTitle>
        </DialogHeader>
        <div className='py-10 px-4 text-center text-sm text-zinc-400'>
          No data available or an error occurred.
        </div>
      </>
    );
  };

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2'>
          <LineChart className='w-4 h-4 text-teal-400' />
          Diamond Hands Analysis
        </h3>
        {renderInitialButton()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-2xl bg-zinc-900/95 border-zinc-700 text-zinc-100'>
          {renderDialogView()}
        </DialogContent>
      </Dialog>
    </>
  );
};
