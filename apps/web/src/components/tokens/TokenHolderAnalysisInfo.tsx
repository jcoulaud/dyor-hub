'use client';

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { SolscanButton } from '@/components/SolscanButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, ApiError, tokens as apiTokens } from '@/lib/api';
import { MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS } from '@/lib/constants';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { TokenPurchaseInfo, TrackedWalletHolderStats } from '@dyor-hub/types';
import {
  AlertTriangle,
  BarChart4,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Diamond,
  DollarSign,
  Info,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { io, Socket } from 'socket.io-client';

const formatTokenAmount = {
  format: (amount: number | null | undefined, symbol?: string) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `${amount.toLocaleString()} ${symbol || ''}`.trim();
  },
};

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
                <linearGradient id='tokenGradientHolder' x1='0' y1='0' x2='0' y2='1'>
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
                      <div className='bg-zinc-800/90 px-3 py-2 rounded-lg border border-zinc-700/70 shadow-lg backdrop-blur-sm'>
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
                fill='url(#tokenGradientHolder)'
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

const WalletStatCard = ({ stats }: { stats: TrackedWalletHolderStats }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { toast } = useToast();
  const activityLevel = getWalletActivityLevel(stats);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Address Copied',
        description: `${text.substring(0, 6)}...${text.substring(
          text.length - 4,
        )} copied to clipboard`,
      });
    });
  };

  const formattedAddress = `${stats.walletAddress.substring(
    0,
    6,
  )}...${stats.walletAddress.substring(stats.walletAddress.length - 4)}`;
  const overallAvgBuyMarketCap =
    stats.overallAverageBuyPriceUsd * (stats.analyzedTokenTotalSupply || 0);

  const totalInvested = stats.purchaseRounds.reduce((sum, round) => sum + round.totalUsdSpent, 0);
  const totalPnl =
    typeof stats.overallRealizedPnlUsd === 'number' ? stats.overallRealizedPnlUsd : 0;
  const pnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

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
                <div className='flex items-justify-between'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='w-3.5 h-3.5 text-zinc-400' />
                    <span className='text-xs text-zinc-400'>First Purchase</span>
                  </div>
                  <span className='text-xs text-zinc-500 ml-auto'>
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

const AnalysisOverview = ({ analysisData }: { analysisData: TrackedWalletHolderStats[] }) => {
  const stats = useMemo(() => {
    const diamondHands = analysisData.filter(
      (wallet) =>
        wallet.currentHoldingDurationSeconds && wallet.currentHoldingDurationSeconds > 604800,
    ).length;

    const paperhands = analysisData.filter(
      (wallet) => wallet.lastSellOffTimestamp !== undefined,
    ).length;

    const earliestPurchaseTime = Math.min(
      ...analysisData
        .filter((wallet) => wallet.firstEverPurchase !== null)
        .map((wallet) => wallet.firstEverPurchase?.timestamp || Infinity),
    );

    const avgHoldingTime =
      analysisData
        .filter((wallet) => wallet.currentHoldingDurationSeconds !== undefined)
        .reduce((sum, wallet) => sum + (wallet.currentHoldingDurationSeconds || 0), 0) /
      analysisData.filter((wallet) => wallet.currentHoldingDurationSeconds !== undefined).length;

    const totalPnl = analysisData.reduce(
      (sum, wallet) => sum + (wallet.overallRealizedPnlUsd || 0),
      0,
    );

    const totalUnrealizedPnl = analysisData.reduce((sum, wallet) => {
      const totalSpentForWallet = wallet.purchaseRounds.reduce(
        (acc, round) => acc + round.totalUsdSpent,
        0,
      );
      const totalSoldForWallet =
        typeof wallet.totalUsdValueOfSales === 'number' ? wallet.totalUsdValueOfSales : 0;
      const currentValueForWallet = wallet.currentBalanceUi * wallet.overallAverageBuyPriceUsd;
      const unrealizedPnlForWallet =
        currentValueForWallet - (totalSpentForWallet - totalSoldForWallet);
      return sum + (isNaN(unrealizedPnlForWallet) ? 0 : unrealizedPnlForWallet);
    }, 0);

    const avgBuyPrice =
      analysisData.reduce((sum, wallet) => sum + wallet.overallAverageBuyPriceUsd, 0) /
      analysisData.length;

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

  const diamondHandsPercentage = Math.round((stats.diamondHands / stats.totalWallets) * 100) || 0;
  const paperHandsPercentage = Math.round((stats.paperhands / stats.totalWallets) * 100) || 0;
  const otherHoldersPercentage = Math.max(0, 100 - diamondHandsPercentage - paperHandsPercentage);

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2'>
        <div className='rounded-lg border border-zinc-700/50 p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <Users className='w-4 h-4 text-zinc-400' />
            <span className='text-xs text-zinc-400'>Analyzed Wallets</span>
          </div>
          <p className='text-lg font-semibold'>{stats.totalWallets}</p>
        </div>

        <div className='rounded-lg border border-zinc-700/50 p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <Diamond className='w-4 h-4 text-teal-400' />
            <span className='text-xs text-zinc-400'>Diamond Hands</span>
          </div>
          <p className='text-lg font-semibold'>{stats.diamondHands}</p>
        </div>

        <div className='rounded-lg border border-zinc-700/50 p-3 mb-2 sm:mb-0'>
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
        <div className='rounded-lg border border-zinc-700/50 p-3'>
          <h3 className='text-sm font-medium text-zinc-300 mb-4'>Holder Distribution</h3>

          <div className='flex flex-col items-center w-full'>
            <svg width='200' height='180' viewBox='0 0 200 200'>
              <defs>
                <linearGradient id='diamondGradientOverview' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10b981' stopOpacity='0.8' />
                  <stop offset='100%' stopColor='#10b981' stopOpacity='0.95' />
                </linearGradient>
                <linearGradient id='paperGradientOverview' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#ef4444' stopOpacity='0.8' />
                  <stop offset='100%' stopColor='#ef4444' stopOpacity='0.95' />
                </linearGradient>
                <linearGradient id='otherGradientOverview' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#64748b' stopOpacity='0.7' />
                  <stop offset='100%' stopColor='#64748b' stopOpacity='0.85' />
                </linearGradient>
              </defs>

              {stats.totalWallets > 0 && (
                <circle cx='100' cy='100' r='70' fill='#27272a' stroke='none' />
              )}

              {diamondHandsPercentage === 100 && (
                <circle
                  cx='100'
                  cy='100'
                  r='70'
                  fill='url(#diamondGradientOverview)'
                  stroke='#18181b'
                  strokeWidth='1'
                />
              )}

              {diamondHandsPercentage > 0 && diamondHandsPercentage < 100 && (
                <path
                  d={`M 100 100 
                    L 100 30 
                    A 70 70 0 ${diamondHandsPercentage > 50 ? 1 : 0} 1 
                    ${100 + 70 * Math.sin((diamondHandsPercentage / 100) * Math.PI * 2)} 
                    ${100 - 70 * Math.cos((diamondHandsPercentage / 100) * Math.PI * 2)} 
                    Z`}
                  fill='url(#diamondGradientOverview)'
                  stroke='#18181b'
                  strokeWidth='1'
                />
              )}

              {paperHandsPercentage === 100 && (
                <circle
                  cx='100'
                  cy='100'
                  r='70'
                  fill='url(#paperGradientOverview)'
                  stroke='#18181b'
                  strokeWidth='1'
                />
              )}

              {paperHandsPercentage > 0 &&
                paperHandsPercentage < 100 &&
                diamondHandsPercentage === 0 && (
                  <path
                    d={`M 100 100 
                    L 100 30 
                    A 70 70 0 ${paperHandsPercentage > 50 ? 1 : 0} 1 
                    ${100 + 70 * Math.sin((paperHandsPercentage / 100) * Math.PI * 2)} 
                    ${100 - 70 * Math.cos((paperHandsPercentage / 100) * Math.PI * 2)} 
                    Z`}
                    fill='url(#paperGradientOverview)'
                    stroke='#18181b'
                    strokeWidth='1'
                  />
                )}

              {paperHandsPercentage > 0 && diamondHandsPercentage > 0 && (
                <path
                  d={`M 100 100 
                    L ${100 + 70 * Math.sin((diamondHandsPercentage / 100) * Math.PI * 2)} 
                      ${100 - 70 * Math.cos((diamondHandsPercentage / 100) * Math.PI * 2)} 
                    A 70 70 0 ${(paperHandsPercentage / 100) * Math.PI * 2 > Math.PI ? 1 : 0} 1 
                      ${100 + 70 * Math.sin(((diamondHandsPercentage + paperHandsPercentage) / 100) * Math.PI * 2)} 
                      ${100 - 70 * Math.cos(((diamondHandsPercentage + paperHandsPercentage) / 100) * Math.PI * 2)} 
                    Z`}
                  fill='url(#paperGradientOverview)'
                  stroke='#18181b'
                  strokeWidth='1'
                />
              )}

              {otherHoldersPercentage > 0 && (
                <path
                  d={`M 100 100 
                    L ${100 + 70 * Math.sin(((diamondHandsPercentage + paperHandsPercentage) / 100) * Math.PI * 2)} 
                      ${100 - 70 * Math.cos(((diamondHandsPercentage + paperHandsPercentage) / 100) * Math.PI * 2)} 
                    A 70 70 0 ${(otherHoldersPercentage / 100) * Math.PI * 2 > Math.PI ? 1 : 0} 1 
                      ${100 + 70 * Math.sin(2 * Math.PI)} 
                      ${100 - 70 * Math.cos(2 * Math.PI)} 
                    Z`}
                  fill='url(#otherGradientOverview)'
                  stroke='#18181b'
                  strokeWidth='1'
                />
              )}
              <circle cx='100' cy='100' r='45' fill='#18181b' />
            </svg>

            <div className='flex justify-center gap-6 mt-4 flex-wrap'>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full bg-emerald-500'></div>
                <span className='text-sm text-zinc-200'>Diamond Hands</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full bg-red-500'></div>
                <span className='text-sm text-zinc-200'>Paper Hands</span>
              </div>
              {otherHoldersPercentage > 0 && (
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 rounded-full bg-slate-500'></div>{' '}
                  <span className='text-sm text-zinc-200'>Other Holders</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-zinc-700/50 p-3'>
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

interface WalletOptionCardProps {
  walletCount: number;
  creditCost?: number;
  isSelected: boolean;
  onClick: () => void;
  isLoading: boolean;
  isFree?: boolean;
  isCostLoadingForOption?: boolean;
}

const WalletOptionCard = ({
  walletCount,
  creditCost,
  isSelected,
  onClick,
  isLoading,
  isFree,
  isCostLoadingForOption,
}: WalletOptionCardProps) => (
  <button
    onClick={onClick}
    disabled={isLoading || isCostLoadingForOption}
    className={cn(
      'transition-all duration-200',
      'bg-zinc-800/90 backdrop-blur-sm rounded-lg',
      'hover:bg-zinc-700/90 relative group',
      'border border-zinc-700/70',
      'flex-1 py-3',
      isSelected && 'bg-zinc-700/90 border-teal-500 ring-1 ring-teal-500',
      isLoading || isCostLoadingForOption ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      !(isLoading || isCostLoadingForOption) && 'hover:bg-zinc-700/90 hover:border-zinc-600/80',
    )}>
    <div className='p-1 space-y-1.5'>
      <div className='flex items-center justify-center gap-2'>
        <Users className='w-4 h-4 text-teal-400' />
        <div className='flex items-baseline gap-1'>
          <span className='text-lg font-semibold text-zinc-100'>{walletCount}</span>
          <span className='text-xs text-zinc-400'>wallets</span>
        </div>
      </div>
      <div className='flex items-center justify-center h-5'>
        {isCostLoadingForOption ? (
          <Loader2 className='w-4 h-4 animate-spin text-zinc-400' />
        ) : isFree ? (
          <span className='text-sm font-medium text-emerald-400'>Free</span>
        ) : creditCost !== undefined ? (
          <div className='flex items-baseline gap-1'>
            <span className='text-sm font-medium text-zinc-100'>{creditCost}</span>
            <span className='text-xs text-zinc-400'>credits</span>
          </div>
        ) : (
          <span className='text-sm font-medium text-zinc-500'>...</span>
        )}
      </div>
    </div>
    <div
      className={cn(
        'absolute inset-0 rounded-lg transition-opacity duration-200',
        'bg-gradient-to-r from-teal-500/5 to-transparent opacity-0',
        'group-hover:opacity-100',
        isSelected && 'opacity-100 from-teal-500/10',
        (isLoading || isCostLoadingForOption) && 'pointer-events-none opacity-0',
      )}
    />
  </button>
);

const InsufficientCreditsContent = ({
  onClose,
  requiredCredits,
  currentCredits,
}: {
  onClose: () => void;
  requiredCredits?: number;
  currentCredits?: number;
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
        You don&apos;t have enough credits to perform this analysis.
        {requiredCredits !== undefined && currentCredits !== undefined && (
          <span className='block mt-1'>
            (Required: {requiredCredits}, Your balance: {currentCredits})
          </span>
        )}
        Purchase more credits to continue.
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
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as 'overview' | 'wallets')}>
          <TabsContent value='overview' className='px-1 pb-4'>
            {analysisData.length > 0 ? (
              <AnalysisOverview analysisData={analysisData} />
            ) : (
              <div className='py-12 text-center'>
                <p className='text-zinc-400'>No holder analysis data available.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value='wallets' className='grid grid-cols-1 md:grid-cols-2 gap-4 px-1 pb-4'>
            {analysisData.map((stats) => (
              <WalletStatCard key={stats.walletAddress} stats={stats} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

interface AnalysisProgress {
  currentWallet: number;
  totalWallets: number;
  currentWalletAddress?: string;
  tradesFound?: number;
  status: 'analyzing' | 'complete' | 'error';
  message?: string;
  error?: string;
  analysisData?: TrackedWalletHolderStats[];
  sessionId?: string;
}

interface TokenHolderAnalysisInfoProps {
  mintAddress: string;
  className?: string;
  userPlatformTokenBalance: number | null | undefined;
}

const getWalletActivityLevel = (stats: TrackedWalletHolderStats): 'high' | 'medium' | 'low' => {
  const purchaseCount = stats.purchaseRounds.reduce(
    (count, round) => count + 1 + round.subsequentPurchasesInRound.length,
    0,
  );

  if (stats.currentHoldingDurationSeconds && stats.currentHoldingDurationSeconds > 2592000) {
    return purchaseCount > 5 ? 'high' : 'medium';
  } else if (stats.currentHoldingDurationSeconds && stats.currentHoldingDurationSeconds > 604800) {
    return purchaseCount > 3 ? 'medium' : 'low';
  }
  return 'low';
};

export function TokenHolderAnalysisInfo({
  mintAddress,
  className,
  userPlatformTokenBalance,
}: TokenHolderAnalysisInfoProps) {
  const { user, isAuthenticated, checkAuth } = useAuthContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<TrackedWalletHolderStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [selectedWalletCount, setSelectedWalletCount] = useState<10 | 20 | 50 | null>(null);
  const [creditCosts, setCreditCosts] = useState<Record<string, number>>({});
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const prevMintAddressRef = useRef<string>(mintAddress);
  const currentAnalysisSessionId = useRef<string | null>(null);
  const socketCreationTime = useRef<number>(0);

  const [isFreeTier, setIsFreeTier] = useState<boolean | null>(null);
  const [isCostFetching, setIsCostFetching] = useState<boolean>(false);
  const [showInsufficientCreditsError, setShowInsufficientCreditsError] = useState<boolean>(false);

  const minHoldingForFree = MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS;

  const ANALYTICS_FEATURE_NAME = 'Diamond Hands Analysis';

  const resetState = useCallback(() => {
    setError(null);
    setSelectedWalletCount(null);
    setAnalysisData(null);
    setCreditCosts({});
    setIsLoading(false);
    setAnalysisProgress(null);
    setHasShownCompletionToast(false);
    currentAnalysisSessionId.current = null;
    setIsFreeTier(null);
    setIsCostFetching(false);
    setShowInsufficientCreditsError(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      resetState();
    }
  }, [dialogOpen, resetState]);

  const handleWalletCountSelect = useCallback(
    (count: 10 | 20 | 50) => {
      setSelectedWalletCount(count);
      if (isFreeTier === false && user && creditCosts[count] !== undefined) {
        if (user.credits < creditCosts[count]) {
          setShowInsufficientCreditsError(true);
        } else {
          setShowInsufficientCreditsError(false);
        }
      } else if (isFreeTier === true) {
        setShowInsufficientCreditsError(false);
      }
    },
    [isFreeTier, user, creditCosts],
  );

  useEffect(() => {
    if (prevMintAddressRef.current !== mintAddress) {
      resetState();
      prevMintAddressRef.current = mintAddress;
    }
  }, [mintAddress, resetState]);

  const fetchCreditCostsInternal = useCallback(async () => {
    if (isFreeTier === true) {
      setIsCostFetching(false);
      setCreditCosts({});
      return;
    }
    setIsCostFetching(true);
    setShowInsufficientCreditsError(false);
    try {
      const costs: Record<string, number> = {};
      const walletCountsToFetch = [10, 20, 50] as const;
      await Promise.all(
        walletCountsToFetch.map(async (count) => {
          const response = await apiTokens.getTokenHolderAnalysisCost(mintAddress, count);
          costs[count] = response.creditCost;
        }),
      );
      setCreditCosts(costs);
      if (user && selectedWalletCount && costs[selectedWalletCount] !== undefined) {
        if (user.credits < costs[selectedWalletCount]) {
          setShowInsufficientCreditsError(true);
        }
      }
    } catch (err) {
      let apiErr: ApiError;
      if (err instanceof ApiError) {
        apiErr = err;
      } else {
        apiErr = new ApiError(500, 'Failed to fetch credit costs.');
      }
      setError(apiErr);
      if (apiErr.status !== 403) {
        toast({
          variant: 'destructive',
          title: `Error ${apiErr.status || ''}`,
          description: apiErr.message || 'Failed to fetch credit costs.',
        });
      }
      setCreditCosts({});
    } finally {
      setIsCostFetching(false);
    }
  }, [mintAddress, user, toast, isFreeTier]);

  useEffect(() => {
    if (dialogOpen) {
      setIsLoading(true);
      setIsFreeTier(null);
      setShowInsufficientCreditsError(false);
      setCreditCosts({});

      if (user && userPlatformTokenBalance !== undefined && userPlatformTokenBalance !== null) {
        if (userPlatformTokenBalance >= minHoldingForFree) {
          setIsFreeTier(true);
          setIsLoading(false);
        } else {
          setIsFreeTier(false);
          fetchCreditCostsInternal().finally(() => setIsLoading(false));
        }
      } else if (
        user &&
        (userPlatformTokenBalance === undefined || userPlatformTokenBalance === null)
      ) {
      } else {
        setIsFreeTier(false);
        fetchCreditCostsInternal().finally(() => setIsLoading(false));
      }
    }
  }, [dialogOpen, user, userPlatformTokenBalance, minHoldingForFree, fetchCreditCostsInternal]);

  const getApiErrorMessage = (apiError: ApiError): string | undefined => {
    if (
      apiError.data &&
      typeof apiError.data === 'object' &&
      'message' in apiError.data &&
      typeof apiError.data.message === 'string'
    ) {
      return apiError.data.message;
    }
    return undefined;
  };

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedWalletCount) return;
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to start an analysis.',
      });
      return;
    }

    // Prevent multiple concurrent requests
    if (isLoading || (analysisProgress && analysisProgress.status === 'analyzing')) {
      return;
    }

    if (isFreeTier === null && !isCostFetching) {
      toast({
        variant: 'default',
        title: 'Please wait',
        description: 'Checking analysis eligibility...',
      });
      return;
    }

    const newSessionId = Math.random().toString(36).substring(2, 15);
    currentAnalysisSessionId.current = newSessionId;
    setError(null);

    if (isFreeTier === false) {
      const cost = creditCosts[selectedWalletCount];
      if (cost === undefined) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Credit cost not available. Please try again.',
        });
        fetchCreditCostsInternal();
        return;
      }
      if (user.credits < cost) {
        setShowInsufficientCreditsError(true);
        return;
      }
    }

    setIsLoading(true);
    setAnalysisData(null);
    setAnalysisProgress({
      currentWallet: 0,
      totalWallets: selectedWalletCount,
      status: 'analyzing',
      message: 'Initializing analysis...',
      sessionId: newSessionId,
    });
    setHasShownCompletionToast(false);

    try {
      await apiTokens.getTokenHolderAnalysis(mintAddress, selectedWalletCount, newSessionId);
    } catch (err) {
      let apiError: ApiError;
      if (err instanceof ApiError) {
        apiError = err;
      } else if (err instanceof Error) {
        apiError = new ApiError(500, err.message || 'An unexpected error occurred.');
      } else {
        apiError = new ApiError(500, 'An unexpected error occurred.');
      }
      setError(apiError);
      setAnalysisProgress((prev) => ({
        ...(prev || {
          currentWallet: 0,
          totalWallets: selectedWalletCount,
          status: 'error',
          sessionId: newSessionId,
        }),
        status: 'error',
        message: apiError.message || 'Failed to start analysis.',
        error: apiError.message,
      }));
      if (apiError.status !== 402 && apiError.status !== 403) {
        toast({
          variant: 'destructive',
          title: `Error ${apiError.status || ''}`,
          description:
            getApiErrorMessage(apiError) || apiError.message || 'Failed to start analysis.',
        });
      }
      setAnalysisData(null);
    } finally {
      if (analysisProgress?.status !== 'analyzing') {
        setIsLoading(false);
      }
    }
  }, [
    mintAddress,
    selectedWalletCount,
    toast,
    creditCosts,
    isFreeTier,
    user,
    isCostFetching,
    fetchCreditCostsInternal,
    analysisProgress?.status,
    isLoading,
  ]);

  useEffect(() => {
    if (!user?.id || !dialogOpen) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrlToConnect = `${API_BASE_URL}/analysis`;
    const socket = io(socketUrlToConnect, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;
    socketCreationTime.current = Date.now();

    const tokenForHandler = mintAddress;

    const handleAnalysisProgress = (data: AnalysisProgress) => {
      const eventTimestamp = Date.now();

      const isMintAddressMismatch = tokenForHandler !== mintAddress;
      const isSocketGone = !socketRef.current;
      const isDialogClosed = !dialogOpen;
      const isStaleMessage = eventTimestamp < socketCreationTime.current;

      if (isMintAddressMismatch || isSocketGone || isDialogClosed || isStaleMessage) {
        return;
      }

      if (currentAnalysisSessionId.current) {
        if (data.sessionId && data.sessionId !== currentAnalysisSessionId.current) {
          return;
        }
      } else {
        if (data.status === 'complete' && data.analysisData && data.analysisData.length > 0) {
          return;
        }
      }

      setAnalysisProgress(data);
      if (data.status === 'complete' || data.status === 'error') {
        setIsLoading(false);
        if (data.analysisData) {
          setAnalysisData(data.analysisData);
        }
        if (data.status === 'complete' && !hasShownCompletionToast) {
          toast({
            title: 'Analysis Complete',
            description: data.message || 'Holder analysis has finished successfully.',
          });
          setHasShownCompletionToast(true);
        } else if (data.status === 'error' && !hasShownCompletionToast) {
          if (data.error && !data.error.toLowerCase().includes('insufficient credits') && !error) {
            toast({
              variant: 'destructive',
              title: 'Analysis Error',
              description: data.message || data.error || 'An error occurred during analysis.',
            });
          }
          setHasShownCompletionToast(true);
        }
      }
    };

    socket.on('analysis_progress', handleAnalysisProgress);

    socket.on('connect_error', (err) => {
      console.error('WebSocket Connection Error:', err.message);
      setAnalysisProgress((prev) => {
        if (prev && prev.status === 'analyzing') {
          return {
            ...prev,
            status: 'error',
            message: 'Connection to analysis service failed.',
            error: 'WebSocket connection failed.',
          };
        }
        return prev;
      });
      setIsLoading(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('analysis_progress', handleAnalysisProgress);
        socketRef.current.off('connect_error');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, dialogOpen, mintAddress, toast, hasShownCompletionToast]);

  const handleOpenDialog = async () => {
    if (!isAuthenticated) {
      await checkAuth(true);
      if (!isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: `You must be logged in to view ${ANALYTICS_FEATURE_NAME}.`,
          variant: 'destructive',
        });
        return;
      }
    }
    setDialogOpen(true);
  };

  const renderInitialButton = () => (
    <Button
      onClick={handleOpenDialog}
      variant='outline'
      size='lg'
      className={cn(
        'w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-teal-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg',
        className,
      )}
      disabled={
        isLoading ||
        (socketRef.current?.connected &&
          analysisProgress !== null &&
          analysisProgress.status !== 'complete')
      }>
      <div className='flex items-center'>
        <div className='w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center mr-3'>
          <Diamond className='w-5 h-5 text-teal-100' />
        </div>
        <span className='font-semibold'>{ANALYTICS_FEATURE_NAME}</span>
      </div>
      {(isLoading ||
        (socketRef.current?.connected &&
          analysisProgress !== null &&
          analysisProgress.status !== 'complete')) &&
      analysisProgress?.status !== 'error' ? (
        <Loader2 className='w-5 h-5 text-teal-400 animate-spin' />
      ) : (
        <ChevronRight className='w-5 h-5 text-teal-400' />
      )}
    </Button>
  );

  const renderWalletCountSelection = () => (
    <>
      <DialogHeader className='pb-4 pt-2'>
        <DialogTitle className='text-zinc-100 flex items-center gap-3'>
          <Diamond className='w-5 h-5 text-teal-400' />
          Select Analysis Scope
        </DialogTitle>
        <DialogDescription className='text-sm text-zinc-400 pt-1'>
          {isLoading && isFreeTier === null && userPlatformTokenBalance === undefined && (
            <span className='flex items-center text-amber-400'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Loading your token balance...
            </span>
          )}
          {isCostFetching && isFreeTier === false && (
            <span className='flex items-center text-amber-400'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Fetching analysis costs...
            </span>
          )}
          {isFreeTier === true && (
            <span className='text-emerald-400 font-medium flex items-center gap-2'>
              <Info size={16} /> This analysis is FREE for you! (You hold{' '}
              {formatTokenAmount.format(userPlatformTokenBalance)}/
              {formatTokenAmount.format(minHoldingForFree)} required $DYORHUB)
            </span>
          )}
          <span>
            Credit cost varies based on the number of wallets and token age. Older tokens require
            more credits.
          </span>
          {isFreeTier === false && userPlatformTokenBalance !== undefined && (
            <span className='text-amber-400 flex items-center gap-1 mt-1 text-sm'>
              <Info size={16} /> Hold {formatTokenAmount.format(minHoldingForFree, '$DYORHUB')} for
              free analysis. Your balance:{' '}
              {formatTokenAmount.format(userPlatformTokenBalance, '$DYORHUB')}.
            </span>
          )}
          {!user && (
            <span className='text-amber-400 flex items-center gap-1 mt-1 text-sm'>
              <Info size={16} /> Log in and hold{' '}
              {formatTokenAmount.format(minHoldingForFree, '$DYORHUB')} for free analysis.
            </span>
          )}
        </DialogDescription>
      </DialogHeader>
      <div className='mt-4 space-y-6 px-1 sm:px-0'>
        {error && error.status === 403 && (
          <TokenGatedMessage featureName='Diamond Hands Analysis' error={error} />
        )}
        {showInsufficientCreditsError &&
          isFreeTier === false &&
          selectedWalletCount &&
          creditCosts[selectedWalletCount] !== undefined && (
            <div className='bg-red-900/30 border border-red-700/50 text-red-300 p-3 rounded-lg text-sm'>
              <p className='font-medium'>Insufficient Credits</p>
              <p>
                You need {creditCosts[selectedWalletCount]} credits for Top {selectedWalletCount}{' '}
                analysis. Your balance: {user?.credits ?? 0} credits.
              </p>
            </div>
          )}
        <div className='flex gap-3'>
          {[10, 20, 50].map((count) => (
            <WalletOptionCard
              key={count}
              walletCount={count}
              creditCost={creditCosts[count]}
              isSelected={selectedWalletCount === count}
              onClick={() => handleWalletCountSelect(count as 10 | 20 | 50)}
              isLoading={
                isLoading &&
                selectedWalletCount === count &&
                analysisProgress?.status === 'analyzing'
              }
              isFree={isFreeTier === true}
              isCostLoadingForOption={
                isCostFetching && creditCosts[count] === undefined && isFreeTier === false
              }
            />
          ))}
        </div>

        {selectedWalletCount && (
          <Button
            className={cn(
              'w-full bg-teal-500 hover:bg-teal-600',
              'text-white font-medium py-4 text-base rounded-lg',
              'transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/20',
            )}
            disabled={
              !user ||
              isLoading ||
              isFreeTier === null ||
              (isFreeTier === false &&
                (isCostFetching || creditCosts[selectedWalletCount] === undefined)) ||
              (isFreeTier === false && showInsufficientCreditsError)
            }
            onClick={handleStartAnalysis}>
            {isLoading && analysisProgress?.status !== 'analyzing' && isFreeTier === null ? (
              <>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                Please wait...
              </>
            ) : analysisProgress?.status === 'analyzing' ? (
              <>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                Analyzing...
              </>
            ) : isFreeTier ? (
              'Start Free Analysis'
            ) : (
              `Start Analysis (${creditCosts[selectedWalletCount] !== undefined ? creditCosts[selectedWalletCount] + ' Credits' : '...'})`
            )}
          </Button>
        )}
      </div>
    </>
  );

  const renderDialogView = () => {
    if (isLoading || (analysisProgress && analysisProgress.status === 'analyzing')) {
      return (
        <>
          <DialogHeader className='pb-2'>
            <DialogTitle className='text-zinc-100 flex items-center'>
              <Diamond className='w-5 h-5 mr-2 text-teal-400' />
              Diamond Hands Analysis
            </DialogTitle>
            <DialogDescription className='text-sm text-zinc-400 mt-1'>
              Analyzing wallet transactions and tracking token holders.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 px-4'>
            <div className='space-y-5'>
              {/* Animated Banner */}
              <div className='relative overflow-hidden rounded-lg bg-gradient-to-r from-teal-900/30 to-zinc-900/50 border border-teal-800/30 p-6'>
                <div className='absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-50'></div>
                <div className='relative z-10 flex items-center'>
                  <div className='mr-4 bg-teal-900/70 rounded-full p-3 backdrop-blur'>
                    <Loader2 className='w-8 h-8 animate-spin text-teal-400' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-teal-100'>
                      {(() => {
                        if (isLoading && !analysisProgress) return 'Initializing analysis...';
                        if (analysisProgress) {
                          if (analysisProgress.status === 'analyzing') {
                            return analysisProgress.message || 'Analyzing in progress';
                          }
                        }
                        return 'Analysis in progress';
                      })()}
                    </h3>
                    {analysisProgress && analysisProgress.currentWallet > 0 && (
                      <p className='text-sm text-zinc-300 mt-1'>
                        Processing wallet {analysisProgress.currentWallet} of{' '}
                        {analysisProgress.totalWallets}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Wallet Address */}
              {analysisProgress && analysisProgress.currentWalletAddress && (
                <div className='bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-3 backdrop-blur-sm'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Wallet className='w-4 h-4 text-zinc-400' />
                      <span className='text-sm font-medium text-zinc-300'>Current Wallet</span>
                    </div>
                    <span className='font-mono text-xs bg-zinc-900/80 px-2 py-1 rounded-md text-zinc-400'>
                      {analysisProgress.currentWalletAddress}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress Bar Section */}
              {analysisProgress && analysisProgress.totalWallets > 0 && (
                <div className='bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-4 backdrop-blur-sm'>
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm font-medium text-zinc-300'>Analysis Progress</span>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-zinc-400'>
                          {(() => {
                            const completedWallets = Math.max(
                              0,
                              analysisProgress.currentWallet - 1,
                            );
                            const progressPercent =
                              (completedWallets / analysisProgress.totalWallets) * 100;
                            return `${Math.round(progressPercent)}%`;
                          })()}
                        </span>
                        <span className='text-xs text-zinc-500'>
                          {Math.max(0, analysisProgress.currentWallet - 1)}/
                          {analysisProgress.totalWallets} wallets
                        </span>
                      </div>
                    </div>
                    <div className='relative pt-1'>
                      <div className='overflow-hidden h-2 text-xs flex rounded-full bg-zinc-700/70'>
                        <div
                          style={{
                            width: (() => {
                              const completedWallets = Math.max(
                                0,
                                analysisProgress.currentWallet - 1,
                              );
                              const progressPercent =
                                (completedWallets / analysisProgress.totalWallets) * 100;
                              return `${progressPercent}%`;
                            })(),
                          }}
                          className='shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300 ease-in-out'></div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {analysisProgress.tradesFound !== undefined && (
                    <div className='mt-3 flex items-center text-xs text-zinc-400'>
                      <TrendingUp className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                      <span>{analysisProgress.tradesFound} transactions processed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className='bg-blue-900/20 border border-blue-800/30 rounded-lg px-4 py-3 text-sm text-blue-200'>
                <div className='flex'>
                  <Info className='w-5 h-5 mr-2 text-blue-400 shrink-0' />
                  <p>
                    This analysis may take several minutes to complete. Results will display
                    automatically when finished. You can safely continue browsing in other tabs
                    while this runs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (error) {
      const isInsufficientCreditsError =
        error.status === 402 ||
        (error.message && error.message.toLowerCase().includes('insufficient credits')) ||
        (error.status === 403 &&
          error.data &&
          typeof error.data === 'object' &&
          'details' in error.data &&
          typeof error.data.details === 'object' &&
          error.data.details !== null &&
          'code' in error.data.details &&
          error.data.details.code === 'INSUFFICIENT_CREDITS');

      if (isInsufficientCreditsError) {
        return (
          <InsufficientCreditsContent
            onClose={handleCloseDialog}
            requiredCredits={selectedWalletCount ? creditCosts[selectedWalletCount] : undefined}
            currentCredits={user?.credits}
          />
        );
      }

      if (error.status === 403) {
        return (
          <div className='p-4'>
            <TokenGatedMessage featureName='Diamond Hands Analysis' error={error} />
          </div>
        );
      }

      return (
        <div className='p-6 text-center'>
          <DialogHeader>
            <DialogTitle className='text-red-400'>Analysis Error</DialogTitle>
            <DialogDescription>
              {getApiErrorMessage(error) || error.message || 'An unexpected error occurred.'}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleCloseDialog} className='mt-6'>
            Retry
          </Button>
        </div>
      );
    }

    if (analysisData) {
      return <HolderAnalysisDialogContent analysisData={analysisData} />;
    }

    return renderWalletCountSelection();
  };

  return (
    <div className={cn('w-full', className)}>
      {renderInitialButton()}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-3xl xl:max-w-5xl bg-zinc-900/95 border-zinc-700/50 backdrop-blur-md text-zinc-50 data-[state=open]:animate-contentShow'>
          {renderDialogView()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
