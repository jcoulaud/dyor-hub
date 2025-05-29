'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn, formatLargeNumber, formatPrice } from '@/lib/utils';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { format, formatDistanceStrict } from 'date-fns';
import { Calendar, Clock, Copy, DollarSign, Target, TrendingUp, Twitter } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

interface DisplayUserCallProps {
  call: TokenCall;
  currentTokenPrice?: number;
  totalUserCalls?: number;
  currentPredictionIndex?: number;
}

export const DisplayUserCall = memo(function DisplayUserCall({
  call,
  currentTokenPrice = 0,
  totalUserCalls = 1,
  currentPredictionIndex = 0,
}: DisplayUserCallProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'price' | 'mcap'>('mcap');

  const canCalculateMcap = useMemo(() => {
    if (typeof call.referenceSupply !== 'string' || call.referenceSupply === null) return false;
    try {
      const supplyNum = parseFloat(call.referenceSupply);
      return !isNaN(supplyNum) && supplyNum > 0;
    } catch {
      return false;
    }
  }, [call.referenceSupply]);

  const targetMcap = useMemo(() => {
    if (!canCalculateMcap) return null;

    let supply: number | null = null;
    try {
      supply = parseFloat(String(call.referenceSupply));
    } catch {
      return null;
    }

    if (supply !== null && supply > 0) {
      const price =
        typeof call.targetPrice === 'string' ? parseFloat(call.targetPrice) : call.targetPrice;

      if (typeof price === 'number' && !isNaN(price)) {
        return price * supply;
      }
    }
    return null;
  }, [call.targetPrice, call.referenceSupply, canCalculateMcap]);

  const formatRatio = (ratio: number | undefined | null) =>
    ratio ? `${(ratio * 100).toFixed(1)}%` : '-';

  const getStatusColor = () => {
    switch (call.status) {
      case TokenCallStatus.VERIFIED_SUCCESS:
        return 'green';
      case TokenCallStatus.VERIFIED_FAIL:
        return 'red';
      case TokenCallStatus.PENDING:
        return 'amber';
      default:
        return 'gray';
    }
  };

  const statusColor = getStatusColor();
  const isPriceUp = call.targetPrice > call.referencePrice;

  const percentChange = ((call.targetPrice - call.referencePrice) / call.referencePrice) * 100;
  const formattedPercentChange = isPriceUp
    ? `+${percentChange.toFixed(2)}%`
    : `${percentChange.toFixed(2)}%`;

  const hasValidCurrentPrice = currentTokenPrice > 0;
  const distanceToTarget = hasValidCurrentPrice
    ? ((call.targetPrice - currentTokenPrice) / currentTokenPrice) * 100
    : 0;
  const isGettingCloser =
    hasValidCurrentPrice &&
    ((isPriceUp && currentTokenPrice > call.referencePrice) ||
      (!isPriceUp && currentTokenPrice < call.referencePrice));
  const formattedDistance = hasValidCurrentPrice
    ? `${Math.abs(distanceToTarget).toFixed(2)}%`
    : '-';

  return (
    <div className='relative group'>
      <div
        className={cn(
          'absolute -inset-0.5 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300',
          call.status === TokenCallStatus.VERIFIED_SUCCESS &&
            'bg-gradient-to-r from-green-500 to-green-600',
          call.status === TokenCallStatus.VERIFIED_FAIL &&
            'bg-gradient-to-r from-red-500 to-red-600',
          call.status === TokenCallStatus.PENDING && 'bg-gradient-to-r from-amber-500 to-amber-600',
          call.status === TokenCallStatus.ERROR && 'bg-gradient-to-r from-zinc-500 to-zinc-600',
        )}></div>
      <Card className='relative rounded-xl backdrop-blur-sm border-0 shadow-lg !bg-transparent'>
        <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0 px-4'>
          <div className='flex items-center'>
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center mr-2.5',
                `bg-${statusColor}-500/15`,
                'group-hover:scale-105 transition-transform duration-300',
              )}>
              <TrendingUp className={`h-4 w-4 text-${statusColor}-400`} />
            </div>
            <CardTitle className='text-base font-medium text-white'>
              {totalUserCalls > 1
                ? `Prediction ${currentPredictionIndex + 1}/${totalUserCalls}`
                : 'Your Prediction'}
            </CardTitle>
          </div>
          <Badge
            variant={call.status === TokenCallStatus.VERIFIED_FAIL ? 'destructive' : 'default'}
            className={cn(
              'rounded-md shadow-sm text-xs font-medium',
              call.status === TokenCallStatus.VERIFIED_SUCCESS &&
                'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30',
              call.status === TokenCallStatus.PENDING &&
                'bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30',
              call.status === TokenCallStatus.ERROR &&
                'bg-zinc-500/20 text-zinc-300 hover:bg-zinc-500/30 border border-zinc-500/30',
            )}>
            {call.status.replace('VERIFIED_', '')}
          </Badge>
        </CardHeader>
        <CardContent className='pt-1 pb-1 px-4'>
          <div className='space-y-3'>
            <div className='rounded-lg p-3 text-center relative shadow-inner'>
              {call.status === TokenCallStatus.PENDING && (
                <div className='absolute top-3 right-3'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 gap-1.5 px-3 cursor-pointer bg-zinc-800/70 hover:bg-zinc-700/70 border border-zinc-700/50 rounded-md hover:scale-105 transition-all group'
                    onClick={(e) => {
                      e.preventDefault();
                      const shareUrl = `${window.location.origin}/token-calls/${call.id}`;
                      const tokenSymbol = call.token?.symbol ? `$${call.token.symbol}` : 'token';
                      const predictedPrice = formatPrice(call.targetPrice);
                      const percentChange =
                        ((call.targetPrice - call.referencePrice) / call.referencePrice) * 100;
                      const percentageText = `(${isPriceUp ? '+' : ''}${percentChange.toFixed(2)}%)`;

                      const tokenAddress = call.token?.mintAddress ? call.token.mintAddress : '';

                      let text = '';
                      if (viewMode === 'mcap' && targetMcap !== null) {
                        const formattedMcap = formatLargeNumber(targetMcap);
                        text = `I'm predicting a market cap of $${formattedMcap} ${percentageText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥\n\n${tokenAddress}\n\n${shareUrl}`;
                      } else {
                        text = `I'm predicting a price of $${predictedPrice} ${percentageText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥\n\n${tokenAddress}\n\n${shareUrl}`;
                      }

                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
                    }}>
                    <Twitter className='h-3.5 w-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors' />
                    <span className='text-xs font-medium text-zinc-400 group-hover:text-amber-400 transition-colors'>
                      Share
                    </span>
                  </Button>
                </div>
              )}
              {call.status === TokenCallStatus.PENDING && (
                <div className='absolute top-3 left-3'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 gap-1.5 px-3 cursor-pointer bg-zinc-800/70 hover:bg-zinc-700/70 border border-zinc-700/50 rounded-md hover:scale-105 transition-all group'
                    onClick={(e) => {
                      e.preventDefault();
                      const shareUrl = `${window.location.origin}/token-calls/${call.id}`;
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        toast({
                          title: 'URL Copied',
                          description: 'Prediction link copied to clipboard',
                        });
                      });
                    }}>
                    <Copy className='h-3.5 w-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors' />
                    <span className='text-xs font-medium text-zinc-400 group-hover:text-amber-400 transition-colors'>
                      Copy
                    </span>
                  </Button>
                </div>
              )}

              <div className='flex items-center justify-center gap-2 mt-6'>
                <span
                  className={cn(
                    'font-semibold text-lg',
                    isPriceUp ? 'text-green-400' : 'text-red-400',
                    'group-hover:scale-110 transition-transform duration-300',
                  )}>
                  {formattedPercentChange}
                </span>
              </div>

              <div className='text-2xl font-bold text-white mt-1.5 mb-1.5'>
                {viewMode === 'price'
                  ? `$${formatPrice(call.targetPrice)}`
                  : canCalculateMcap && targetMcap !== null
                    ? `$${formatLargeNumber(targetMcap)}`
                    : '-'}
              </div>

              <Tabs
                value={viewMode}
                onValueChange={(value) => {
                  setViewMode(value as 'price' | 'mcap');
                }}
                className='mt-1 inline-block'>
                <TabsList className='h-7 p-0.5 bg-zinc-700/50 border border-zinc-600/50 rounded-lg'>
                  <TabsTrigger
                    value='mcap'
                    disabled={!canCalculateMcap}
                    className='h-6 px-3 text-xs data-[state=active]:bg-zinc-600/80 data-[state=active]:text-zinc-100 text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md'
                    onClick={(e) => e.stopPropagation()}>
                    Target Mcap
                  </TabsTrigger>
                  <TabsTrigger
                    value='price'
                    className='h-6 px-3 text-xs data-[state=active]:bg-zinc-600/80 data-[state=active]:text-zinc-100 text-zinc-400 rounded-md'
                    onClick={(e) => e.stopPropagation()}>
                    Target Price
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className='grid grid-cols-2 gap-2 text-sm px-1'>
              <div className='space-y-2'>
                <div className='flex items-start group/item hover:bg-zinc-800/30 p-1 rounded-lg transition-colors'>
                  <Calendar className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                  <div>
                    <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                      Target Date
                    </div>
                    <div className='font-medium text-zinc-300 text-xs group-hover/item:text-white transition-colors'>
                      {format(new Date(call.targetDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div className='flex items-start group/item hover:bg-zinc-800/30 p-1 rounded-lg transition-colors'>
                  <DollarSign className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                  <div>
                    <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                      {viewMode === 'mcap' ? 'Reference MCap' : 'Reference Price'}
                    </div>
                    <div className='font-medium text-zinc-300 group-hover/item:text-white transition-colors'>
                      $
                      {viewMode === 'mcap' && targetMcap !== null && canCalculateMcap
                        ? formatLargeNumber((call.referencePrice / call.targetPrice) * targetMcap)
                        : formatPrice(call.referencePrice)}
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-start group/item hover:bg-zinc-800/30 p-1 rounded-lg transition-colors'>
                  <Clock className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                  <div>
                    <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                      Call Placed
                    </div>
                    <div className='font-medium text-zinc-300 text-xs group-hover/item:text-white transition-colors'>
                      {formatDistanceStrict(new Date(call.callTimestamp), new Date()) + ' ago'}
                    </div>
                  </div>
                </div>

                <div className='flex items-start group/item hover:bg-zinc-800/30 p-1 rounded-lg transition-colors'>
                  <Target className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                  <div>
                    <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                      Target Distance
                    </div>
                    <div
                      className={cn(
                        'font-medium text-xs',
                        !hasValidCurrentPrice && 'text-zinc-300',
                        hasValidCurrentPrice && isGettingCloser && 'text-green-300',
                        hasValidCurrentPrice && !isGettingCloser && 'text-red-300',
                        'group-hover/item:brightness-125 transition-colors',
                      )}>
                      {hasValidCurrentPrice
                        ? distanceToTarget > 0
                          ? `+${formattedDistance}`
                          : `-${formattedDistance}`
                        : 'No current price'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(call.status === TokenCallStatus.VERIFIED_SUCCESS ||
              call.status === TokenCallStatus.VERIFIED_FAIL) && (
              <div className='mt-0 pt-2 border-t border-zinc-800/50'>
                <div className='grid grid-cols-2 gap-3 text-sm px-1'>
                  <div className='flex items-start group/item hover:bg-zinc-800/30 p-1.5 rounded-lg transition-colors'>
                    <Target className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                    <div>
                      <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                        {viewMode === 'mcap' ? 'Peak MCap' : 'Peak Price'}
                      </div>
                      <div className='font-medium text-zinc-300 group-hover/item:text-white transition-colors'>
                        $
                        {viewMode === 'mcap' &&
                        targetMcap !== null &&
                        canCalculateMcap &&
                        call.peakPriceDuringPeriod
                          ? formatLargeNumber(
                              (call.peakPriceDuringPeriod / call.targetPrice) * targetMcap,
                            )
                          : formatPrice(call.peakPriceDuringPeriod)}
                      </div>
                    </div>
                  </div>

                  {call.status === TokenCallStatus.VERIFIED_SUCCESS && call.targetHitTimestamp && (
                    <div className='flex items-start group/item hover:bg-zinc-800/30 p-1.5 rounded-lg transition-colors'>
                      <Clock className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                      <div>
                        <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                          Target Hit
                        </div>
                        <div className='font-medium text-zinc-300 text-xs group-hover/item:text-white transition-colors'>
                          {formatDistanceStrict(new Date(call.targetHitTimestamp), new Date()) +
                            ' ago'}
                        </div>
                      </div>
                    </div>
                  )}

                  {call.status === TokenCallStatus.VERIFIED_SUCCESS &&
                    call.timeToHitRatio !== null && (
                      <div className='flex items-start group/item hover:bg-zinc-800/30 p-1.5 rounded-lg transition-colors'>
                        <Clock className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                        <div>
                          <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                            Time to Hit
                          </div>
                          <div className='font-medium text-zinc-300 group-hover/item:text-white transition-colors'>
                            {formatRatio(call.timeToHitRatio)} of timeframe
                          </div>
                        </div>
                      </div>
                    )}

                  {call.status === TokenCallStatus.VERIFIED_FAIL && (
                    <div className='flex items-start group/item hover:bg-zinc-800/30 p-1.5 rounded-lg transition-colors'>
                      <DollarSign className='h-4 w-4 text-zinc-400 mt-0.5 mr-2.5 flex-shrink-0 group-hover/item:text-amber-400 transition-colors' />
                      <div>
                        <div className='text-xs text-zinc-500 group-hover/item:text-zinc-400 transition-colors'>
                          {viewMode === 'mcap' ? 'Final MCap' : 'Final Price'}
                        </div>
                        <div className='font-medium text-zinc-300 group-hover/item:text-white transition-colors'>
                          $
                          {viewMode === 'mcap' &&
                          targetMcap !== null &&
                          canCalculateMcap &&
                          call.finalPriceAtTargetDate
                            ? formatLargeNumber(
                                (call.finalPriceAtTargetDate / call.targetPrice) * targetMcap,
                              )
                            : formatPrice(call.finalPriceAtTargetDate)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
