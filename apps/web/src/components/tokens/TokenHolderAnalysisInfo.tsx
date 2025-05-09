'use client';

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  TokenGatedErrorData,
  TokenPurchaseInfo,
  TrackedWalletHolderStats,
} from '@dyor-hub/types';
import {
  AlertTriangle,
  BarChart4,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Diamond,
  DollarSign,
  LineChart,
  Lock,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value !== 0 && Math.abs(value) < 0.01 ? 6 : 2,
  }).format(value);
};

interface TokenHolderAnalysisInfoProps {
  mintAddress: string;
  className?: string;
}

const getWalletActivityLevel = (stats: TrackedWalletHolderStats): 'high' | 'medium' | 'low' => {
  const purchaseCount = stats.purchaseRounds.reduce(
    (count, round) => count + 1 + round.subsequentPurchasesInRound.length,
    0,
  );

  if (stats.currentHoldingDurationSeconds && stats.currentHoldingDurationSeconds > 2592000) {
    // 30 days
    return purchaseCount > 5 ? 'high' : 'medium';
  } else if (stats.currentHoldingDurationSeconds && stats.currentHoldingDurationSeconds > 604800) {
    // 7 days
    return purchaseCount > 3 ? 'medium' : 'low';
  }
  return 'low';
};

const StyledProgress = ({
  value,
  className,
  variant,
}: {
  value: number;
  className?: string;
  variant?: 'positive' | 'negative' | 'neutral';
}) => {
  const getColor = () => {
    if (variant === 'positive') return 'bg-emerald-500';
    if (variant === 'negative') return 'bg-red-500';
    if (variant === 'neutral') return 'bg-teal-500';
    return '';
  };

  return <Progress value={value} className={cn('h-1.5', getColor(), className)} />;
};

// Component to display wallet purchase history as a timeline
const WalletPurchaseTimeline = ({
  stats,
  showGraph = true,
}: {
  stats: TrackedWalletHolderStats;
  showGraph?: boolean;
}) => {
  const allPurchases = useMemo(() => {
    const purchases: (TokenPurchaseInfo & { roundId: number; txHash?: string })[] = [];

    stats.purchaseRounds.forEach((round) => {
      // Add transaction hash if available (from BirdeyeTokenTradeV3Item)
      const firstPurchase = {
        ...round.firstPurchaseInRound,
        roundId: round.roundId,
        txHash: (round.firstPurchaseInRound as unknown as { txHash?: string })?.txHash || undefined,
      };
      purchases.push(firstPurchase);

      round.subsequentPurchasesInRound.forEach((purchase) => {
        const subsequentPurchase = {
          ...purchase,
          roundId: round.roundId,
          txHash: (purchase as unknown as { txHash?: string })?.txHash || undefined,
        };
        purchases.push(subsequentPurchase);
      });
    });

    return purchases.sort((a, b) => a.timestamp - b.timestamp);
  }, [stats]);

  // Create a dataset suitable for a line chart showing token accumulation over time
  const tokenAccumulationData = useMemo(() => {
    if (allPurchases.length === 0) return [];

    let runningTotal = 0;
    return allPurchases.map((purchase) => {
      runningTotal += purchase.tokenAmountUi;
      return {
        time: purchase.timestamp,
        timeFormatted: formatTimestamp(purchase.timestamp),
        tokens: runningTotal,
        price: purchase.priceUsd,
      };
    });
  }, [allPurchases]);

  if (allPurchases.length === 0) {
    return <p className='text-zinc-500 text-xs italic'>No purchase history available</p>;
  }

  return (
    <div className='space-y-4'>
      {showGraph && (
        <div className='h-24'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={tokenAccumulationData}>
              <defs>
                <linearGradient id='tokenGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10b981' stopOpacity={0.8} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='#3f3f46' />
              <RechartsTooltip
                content={(props) => {
                  if (props.active && props.payload && props.payload.length) {
                    const data = props.payload[0].payload;
                    return (
                      <div className='bg-zinc-800/90 px-3 py-2 rounded-lg border border-zinc-700/50 shadow-lg backdrop-blur-sm'>
                        <p className='text-xs text-zinc-400'>{data.timeFormatted}</p>
                        <p className='text-sm font-medium text-white'>
                          {data.tokens.toLocaleString()} tokens
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type='monotone'
                dataKey='tokens'
                stroke='#10b981'
                fillOpacity={1}
                fill='url(#tokenGradient)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!showGraph && (
        <div className='max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 pr-2 space-y-2'>
          {allPurchases.map((purchase, index) => (
            <div key={index} className='bg-zinc-800/40 p-2 rounded-md border border-zinc-700/50'>
              <div className='flex justify-between text-xs'>
                <span className='text-zinc-400'>{formatTimestamp(purchase.timestamp)}</span>
                {purchase.txHash && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SolscanButton
                          address={purchase.txHash}
                          type='tx'
                          className='text-blue-400 hover:text-blue-300 transition-colors cursor-pointer text-xs'>
                          View TX
                        </SolscanButton>
                      </TooltipTrigger>
                      <TooltipContent>View Transaction on Solscan</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className='flex justify-between items-center mt-1'>
                <div>
                  <p className='text-xs text-zinc-300'>
                    {purchase.tokenAmountUi.toLocaleString()} tokens
                  </p>
                  <p className='text-xs text-zinc-300'>{formatCurrency(purchase.spentUsd)}</p>
                </div>
                {purchase.approxMarketCapAtPurchaseUsd !== undefined ? (
                  <div className='bg-zinc-900/80 rounded px-2 py-1 text-xs'>
                    <p className='text-xs text-zinc-300'>
                      MCAP: ${purchase.approxMarketCapAtPurchaseUsd.toLocaleString()}
                    </p>
                    <p className='text-xs text-zinc-300'>
                      Price: {formatCurrency(purchase.priceUsd)}
                    </p>
                  </div>
                ) : (
                  <div className='bg-zinc-900/80 rounded px-2 py-1 text-xs'>
                    <p className='text-xs text-zinc-300'>
                      Price: {formatCurrency(purchase.priceUsd)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Card component for displaying individual wallet statistics
const WalletStatCard = ({ stats }: { stats: TrackedWalletHolderStats }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { toast } = useToast();
  const activityLevel = getWalletActivityLevel(stats);

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

  // Calculate overall statistics
  const totalInvested = stats.purchaseRounds.reduce((sum, round) => sum + round.totalUsdSpent, 0);
  const totalPnl =
    typeof stats.overallRealizedPnlUsd === 'number' ? stats.overallRealizedPnlUsd : 0;
  const pnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Calculate unrealized PNL (current value - remaining investment)
  const totalSpent = stats.purchaseRounds.reduce((sum, round) => sum + round.totalUsdSpent, 0);
  const totalSold = typeof stats.totalUsdValueOfSales === 'number' ? stats.totalUsdValueOfSales : 0;
  const currentValue = stats.currentBalanceUi * stats.overallAverageBuyPriceUsd;
  const unrealizedPnl = currentValue - (totalSpent - totalSold);

  return (
    <Card className='bg-zinc-900/95 border-zinc-700/60 overflow-hidden shadow-xl'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                activityLevel === 'high'
                  ? 'bg-green-500'
                  : activityLevel === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-zinc-500',
              )}
            />
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
              className='p-1 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer'>
              <Copy className='h-3.5 w-3.5' />
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium px-2 py-1 bg-zinc-800 rounded-full text-zinc-300'>
              {stats.percentageOfTotalSupply?.toFixed(2) ?? '-'}%{' '}
              <span className='hidden sm:inline'>Supply</span>
            </span>
            <Diamond className='h-4 w-4 text-teal-400' />
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0 pb-3'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='w-full bg-zinc-800/50 mb-3 rounded-md'>
            <TabsTrigger
              value='overview'
              className={cn(
                'text-xs flex-1 py-1.5',
                activeTab === 'overview'
                  ? 'bg-zinc-700/80 text-white rounded-md'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}>
              Overview
            </TabsTrigger>
            <TabsTrigger
              value='history'
              className={cn(
                'text-xs flex-1 py-1.5',
                activeTab === 'history'
                  ? 'bg-zinc-700/80 text-white rounded-md'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}>
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='mt-0 space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='bg-zinc-800/40 p-2 rounded-md border border-zinc-700/50'>
                <div className='flex items-center gap-2 mb-1'>
                  <Wallet className='w-3.5 h-3.5 text-zinc-400' />
                  <span className='text-xs text-zinc-400'>Current Balance</span>
                </div>
                <p className='text-sm font-semibold'>{stats.currentBalanceUi.toLocaleString()}</p>
              </div>

              <div className='bg-zinc-800/40 p-2 rounded-md border border-zinc-700/50'>
                <div className='flex items-center gap-2 mb-1'>
                  <Clock className='w-3.5 h-3.5 text-zinc-400' />
                  <span className='text-xs text-zinc-400'>Holding Time</span>
                </div>
                <p className='text-sm font-semibold'>
                  {stats.currentHoldingDurationSeconds
                    ? formatDuration(stats.currentHoldingDurationSeconds)
                    : '-'}
                </p>
              </div>
            </div>

            <div className='bg-zinc-800/40 p-2 rounded-md border border-zinc-700/50'>
              <div className='flex items-center gap-2 mb-1'>
                <TrendingUp className='w-3.5 h-3.5 text-zinc-400' />
                <span className='text-xs text-zinc-400'>Avg. Buy</span>
              </div>
              <div className='flex justify-between items-center'>
                {stats.analyzedTokenTotalSupply && stats.overallAverageBuyPriceUsd > 0 ? (
                  <>
                    <p className='text-sm font-semibold'>
                      MCAP: ~${overallAvgBuyMarketCap.toLocaleString()}
                    </p>
                    <span className='text-sm text-zinc-300 ml-2'>
                      Price: {formatCurrency(stats.overallAverageBuyPriceUsd)}
                    </span>
                  </>
                ) : (
                  <p className='text-sm font-semibold'>
                    {formatCurrency(stats.overallAverageBuyPriceUsd)}
                  </p>
                )}
              </div>
            </div>

            {stats.firstEverPurchase && (
              <div className='bg-zinc-800/40 p-2 rounded-md border border-zinc-700/50'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='w-3.5 h-3.5 text-zinc-400' />
                    <span className='text-xs text-zinc-400'>First Purchase</span>
                  </div>
                  <span className='text-xs text-zinc-500'>
                    {formatTimestamp(stats.firstEverPurchase.timestamp)}
                  </span>
                </div>
                <div className='mt-1'>
                  {stats.firstEverPurchase.approxMarketCapAtPurchaseUsd !== undefined ? (
                    <div className='flex justify-between items-center'>
                      <p className='text-sm font-semibold'>
                        MCAP: ~$
                        {stats.firstEverPurchase.approxMarketCapAtPurchaseUsd.toLocaleString()}
                      </p>
                      <span className='text-sm text-zinc-300 ml-2'>
                        Price: {formatCurrency(stats.firstEverPurchase.priceUsd)}
                      </span>
                    </div>
                  ) : (
                    <p className='text-sm font-semibold'>
                      {formatCurrency(stats.firstEverPurchase.priceUsd)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <WalletPurchaseTimeline stats={stats} showGraph={true} />

            <div className='grid grid-cols-2 gap-2'>
              {stats.overallRealizedPnlUsd !== undefined && (
                <div
                  className={cn(
                    'p-2 rounded-md border',
                    stats.overallRealizedPnlUsd >= 0
                      ? 'bg-emerald-950/20 border-emerald-800/30'
                      : 'bg-red-950/20 border-red-800/30',
                  )}>
                  <div className='flex items-center gap-2 mb-1'>
                    <DollarSign
                      className={cn(
                        'w-3.5 h-3.5',
                        stats.overallRealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    />
                    <span className='text-xs text-zinc-400'>Realized PNL</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        stats.overallRealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                      {formatCurrency(stats.overallRealizedPnlUsd)}
                    </p>
                    <span
                      className={cn(
                        'text-xs',
                        pnlPercentage >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                      {pnlPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div className='p-2 rounded-md border bg-yellow-950/20 border-yellow-700/30'>
                <div className='flex items-center gap-2 mb-1'>
                  <DollarSign className='w-3.5 h-3.5 text-yellow-400' />
                  <span className='text-xs text-zinc-400'>Unrealized PNL</span>
                </div>
                <p className='text-sm font-semibold text-yellow-400'>
                  {formatCurrency(unrealizedPnl)}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='history' className='mt-0'>
            <WalletPurchaseTimeline stats={stats} showGraph={false} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Component to display statistics overview for all analyzed wallets
const AnalysisOverview = ({ analysisData }: { analysisData: TrackedWalletHolderStats[] }) => {
  // Calculate aggregated stats
  const stats = useMemo(() => {
    const diamondHands = analysisData.filter(
      (wallet) =>
        wallet.currentHoldingDurationSeconds && wallet.currentHoldingDurationSeconds > 604800, // 7+ days
    ).length;

    const paperhands = analysisData.filter(
      (wallet) => wallet.lastSellOffTimestamp !== undefined,
    ).length;

    // Find the earliest buyer among all analyzed wallets
    const earliestPurchaseTime = Math.min(
      ...analysisData
        .filter((wallet) => wallet.firstEverPurchase !== null)
        .map((wallet) => wallet.firstEverPurchase?.timestamp || Infinity),
    );

    // Average holding time
    const avgHoldingTime =
      analysisData
        .filter((wallet) => wallet.currentHoldingDurationSeconds !== undefined)
        .reduce((sum, wallet) => sum + (wallet.currentHoldingDurationSeconds || 0), 0) /
      analysisData.filter((wallet) => wallet.currentHoldingDurationSeconds !== undefined).length;

    // Total profit/loss across all wallets
    const totalPnl = analysisData.reduce(
      (sum, wallet) => sum + (wallet.overallRealizedPnlUsd || 0),
      0,
    );

    // Total unrealized profit/loss
    const totalUnrealizedPnl = analysisData.reduce((sum, wallet) => {
      const totalSpent = wallet.purchaseRounds.reduce((acc, round) => acc + round.totalUsdSpent, 0);
      const totalSold =
        typeof wallet.totalUsdValueOfSales === 'number' ? wallet.totalUsdValueOfSales : 0;
      const currentValue = wallet.currentBalanceUi * wallet.overallAverageBuyPriceUsd;
      const unrealizedPnl = currentValue - (totalSpent - totalSold);
      return sum + unrealizedPnl;
    }, 0);

    // Average buying price
    const avgBuyPrice =
      analysisData.reduce((sum, wallet) => sum + wallet.overallAverageBuyPriceUsd, 0) /
      analysisData.length;

    // Average market cap at purchase time
    const avgMarketCap = avgBuyPrice * (analysisData[0]?.analyzedTokenTotalSupply || 0);

    return {
      totalWallets: analysisData.length,
      diamondHands,
      paperhands,
      earliestPurchaseTime: earliestPurchaseTime !== Infinity ? earliestPurchaseTime : undefined,
      avgHoldingTime: isNaN(avgHoldingTime) ? undefined : avgHoldingTime,
      totalPnl,
      totalUnrealizedPnl,
      avgBuyPrice: isNaN(avgBuyPrice) ? 0 : avgBuyPrice,
      avgMarketCap: isNaN(avgMarketCap) ? 0 : avgMarketCap,
    };
  }, [analysisData]);

  // Calculate percentages for the pie chart
  const diamondHandsPercentage = Math.round((stats.diamondHands / stats.totalWallets) * 100) || 0;
  const paperHandsPercentage = Math.round((stats.paperhands / stats.totalWallets) * 100) || 0;

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2'>
        <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <Users className='w-4 h-4 text-zinc-400' />
            <span className='text-xs text-zinc-400'>Analyzed Wallets</span>
          </div>
          <p className='text-lg font-semibold'>{stats.totalWallets}</p>
        </div>

        <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <Diamond className='w-4 h-4 text-teal-400' />
            <span className='text-xs text-zinc-400'>Diamond Hands</span>
          </div>
          <p className='text-lg font-semibold'>{stats.diamondHands}</p>
        </div>

        <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-3 mb-2 sm:mb-0'>
          <div className='flex items-center gap-2 mb-1'>
            <Clock className='w-4 h-4 text-amber-400' />
            <span className='text-xs text-zinc-400'>Avg Holding Time</span>
          </div>
          <p className='text-lg font-semibold'>
            {stats.avgHoldingTime ? formatDuration(stats.avgHoldingTime) : '-'}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-3'>
          <h3 className='text-sm font-medium text-zinc-300 mb-4'>Holder Distribution</h3>

          <div className='flex flex-col items-center w-full'>
            <svg width='200' height='180' viewBox='0 0 200 200'>
              <defs>
                <linearGradient id='diamondGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10b981' stopOpacity='0.8' />
                  <stop offset='100%' stopColor='#10b981' stopOpacity='0.95' />
                </linearGradient>
                <linearGradient id='paperGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#ef4444' stopOpacity='0.8' />
                  <stop offset='100%' stopColor='#ef4444' stopOpacity='0.95' />
                </linearGradient>
              </defs>

              {/* Diamond Hands portion */}
              <path
                d={`M 100 100 L 100 30 A 70 70 0 ${diamondHandsPercentage > 50 ? 1 : 0} 1 ${100 + 70 * Math.sin((2 * Math.PI * diamondHandsPercentage) / 100)} ${100 - 70 * Math.cos((2 * Math.PI * diamondHandsPercentage) / 100)} Z`}
                fill='url(#diamondGradient)'
                stroke='#18181b'
                strokeWidth='1'
              />

              {/* Paper Hands portion */}
              <path
                d={`M 100 100 L ${100 + 70 * Math.sin((2 * Math.PI * diamondHandsPercentage) / 100)} ${100 - 70 * Math.cos((2 * Math.PI * diamondHandsPercentage) / 100)} A 70 70 0 ${paperHandsPercentage > 50 ? 1 : 0} 1 100 30 Z`}
                fill='url(#paperGradient)'
                stroke='#18181b'
                strokeWidth='1'
              />

              {/* Inner circle (hole) */}
              <circle cx='100' cy='100' r='45' fill='#18181b' />

              {/* Percentage labels - positioned outside the chart */}
              {diamondHandsPercentage > 0 && (
                <text
                  x={100 + 88 * Math.sin((Math.PI * diamondHandsPercentage) / 100 / 2)}
                  y={100 - 88 * Math.cos((Math.PI * diamondHandsPercentage) / 100 / 2)}
                  fill='#10b981'
                  fontSize='16'
                  fontWeight='600'
                  textAnchor={diamondHandsPercentage < 50 ? 'start' : 'middle'}
                  dominantBaseline='middle'>
                  {diamondHandsPercentage}%
                </text>
              )}

              {paperHandsPercentage > 0 && (
                <text
                  x={100 + 88 * Math.sin(Math.PI * (2 - paperHandsPercentage / 100 / 2))}
                  y={100 - 88 * Math.cos(Math.PI * (2 - paperHandsPercentage / 100 / 2))}
                  fill='#ef4444'
                  fontSize='16'
                  fontWeight='600'
                  textAnchor={paperHandsPercentage < 50 ? 'end' : 'middle'}
                  dominantBaseline='middle'>
                  {paperHandsPercentage}%
                </text>
              )}
            </svg>

            <div className='flex justify-center gap-8 mt-4'>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full bg-emerald-500'></div>
                <span className='text-sm text-zinc-200'>Diamond Hands</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full bg-red-500'></div>
                <span className='text-sm text-zinc-200'>Paper Hands</span>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-3'>
          <h3 className='text-sm font-medium text-zinc-300 mb-2'>Key Metrics</h3>
          <div className='space-y-3'>
            <div>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-xs text-zinc-400'>Earliest Purchase</span>
                <span className='text-xs text-zinc-300'>
                  {stats.earliestPurchaseTime ? formatTimestamp(stats.earliestPurchaseTime) : '-'}
                </span>
              </div>
              <StyledProgress value={100} variant='neutral' />
            </div>

            <div>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-xs text-zinc-400'>Average Market Cap</span>
                <span className='text-xs text-zinc-300'>
                  ${stats.avgMarketCap.toLocaleString()}
                </span>
              </div>
              <StyledProgress value={70} variant='neutral' />
            </div>

            <div>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-xs text-zinc-400'>Total Realized PNL</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                  )}>
                  {formatCurrency(stats.totalPnl)}
                </span>
              </div>
              <StyledProgress value={100} variant={stats.totalPnl >= 0 ? 'positive' : 'negative'} />
            </div>

            <div>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-xs text-zinc-400'>Total Unrealized PNL</span>
                <span className='text-xs font-medium text-yellow-400'>
                  {formatCurrency(stats.totalUnrealizedPnl)}
                </span>
              </div>
              <StyledProgress value={100} className='bg-yellow-500' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HolderAnalysisDialogContent = ({
  analysisData,
}: {
  analysisData: TrackedWalletHolderStats[];
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'wallets'>('overview');

  return (
    <>
      <DialogHeader className='pb-2'>
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center'>
          <DialogTitle className='text-zinc-100 flex items-center mb-3 sm:mb-0'>
            <Diamond className='w-5 h-5 mr-2 text-teal-400' />
            Diamond Hands Analysis
          </DialogTitle>

          <div className='flex space-x-1 sm:mr-6'>
            <Button
              variant={activeView === 'overview' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveView('overview')}
              className={cn(
                'w-full sm:w-auto',
                activeView === 'overview'
                  ? 'bg-teal-500 hover:bg-teal-600 text-white'
                  : 'bg-zinc-800',
              )}>
              <BarChart4 className='w-4 h-4 mr-1' />
              Overview
            </Button>
            <Button
              variant={activeView === 'wallets' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveView('wallets')}
              className={cn(
                'w-full sm:w-auto',
                activeView === 'wallets'
                  ? 'bg-teal-500 hover:bg-teal-600 text-white'
                  : 'bg-zinc-800',
              )}>
              <Wallet className='w-4 h-4 mr-1' />
              Wallets
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div
        className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 flex-1 mt-2'
        style={{ maxHeight: '70vh' }}>
        {analysisData.length > 0 ? (
          activeView === 'overview' ? (
            <div className='px-1 pb-4'>
              <AnalysisOverview analysisData={analysisData} />
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 px-1 pb-4'>
              {analysisData.map((stats) => (
                <WalletStatCard key={stats.walletAddress} stats={stats} />
              ))}
            </div>
          )
        ) : (
          <div className='py-12 text-center'>
            <p className='text-zinc-400'>No holder analysis data available.</p>
          </div>
        )}
      </div>
    </>
  );
};

// Loading dialog content
const LoadingDialogContent = () => (
  <>
    <DialogHeader className='pb-2 opacity-50'>
      <DialogTitle className='text-zinc-100 flex items-center'>
        <Diamond className='w-5 h-5 mr-2 text-teal-400' />
        Diamond Hands Analysis
      </DialogTitle>
    </DialogHeader>
    <div className='py-6 px-4'>
      <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/50 p-4 mb-4 animate-pulse'>
        <div className='flex justify-between items-center'>
          <Skeleton className='h-4 w-32' />
          <div className='flex space-x-2'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4'>
        <Skeleton className='h-20 rounded-lg' />
        <Skeleton className='h-20 rounded-lg' />
        <Skeleton className='h-20 rounded-lg' />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Skeleton className='h-48 rounded-lg' />
        <Skeleton className='h-48 rounded-lg' />
      </div>
    </div>
  </>
);

// Main component
export const TokenHolderAnalysisInfo = ({
  mintAddress,
  className,
}: TokenHolderAnalysisInfoProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<TrackedWalletHolderStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
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
        if (err.status !== 403) {
          const errorData = err.data as Partial<TokenGatedErrorData> | string | undefined;
          const messageFromServer =
            typeof errorData === 'object' && errorData?.message
              ? errorData.message
              : typeof errorData === 'string'
                ? errorData
                : err.message;
          toast({
            variant: 'destructive',
            title: `Error ${err.status || ''}`,
            description: messageFromServer || 'An error occurred while fetching holder analysis.',
          });
        }
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
  }, [mintAddress, toast]);

  const handleButtonClick = useCallback(() => {
    setDialogOpen(true);
    if (!analysisData || error) {
      fetchData();
    }
  }, [analysisData, error, fetchData]);

  const renderInitialButton = () => (
    <Button
      onClick={handleButtonClick}
      variant='outline'
      size='sm'
      disabled={dialogOpen && isLoading}
      className='w-full bg-zinc-900/60 border-zinc-700/50 hover:bg-zinc-800/80 text-zinc-200 flex items-center justify-between'>
      <div className='flex items-center'>
        <LineChart className='w-4 h-4 mr-2 text-zinc-200' />
        <span className='font-medium'>View Diamond Hands Analysis</span>
      </div>
      <ChevronRight className='w-4 h-4 ml-auto' />
    </Button>
  );

  const renderDialogView = () => {
    if (isLoading) {
      return <LoadingDialogContent />;
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
            <TokenGatedMessage error={error} featureName='Diamond Hands Analysis' />
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
          Click button to load analysis or no data found.
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
