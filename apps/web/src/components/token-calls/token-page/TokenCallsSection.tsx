'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TokenCall } from '@dyor-hub/types';
import { ChevronLeft, ChevronRight, LineChart } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DisplayUserCall } from './DisplayUserCall';
import { MakeCallModal } from './MakeCallModal';
import { TokenCallsStats } from './TokenCallsStats';

interface TokenCallsSectionProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  isPriceValid: boolean;
  userCalls: TokenCall[];
  isLoadingUserCalls: boolean;
  onCallCreated?: () => void;
  marketCap?: number;
  circulatingSupply?: string;
}

export function TokenCallsSection({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  isPriceValid,
  userCalls,
  isLoadingUserCalls,
  onCallCreated,
  marketCap,
  circulatingSupply,
}: TokenCallsSectionProps) {
  const [tokenCallsData, setTokenCallsData] = useState<TokenCall[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [isTransitioningPrediction, setIsTransitioningPrediction] = useState(false);

  const fetchStatsData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const result = await tokenCalls.list({ tokenId: tokenId }, { page: 1, limit: 20 });
      setTokenCallsData(result.items);
    } catch {
      setTokenCallsData([]);
    } finally {
      setIsLoadingStats(false);
    }
  }, [tokenId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchStatsData();
      } catch {
        setIsLoadingStats(false);
      }
    };

    loadData();
    if (currentPredictionIndex >= userCalls.length) {
      setCurrentPredictionIndex(0);
    }
  }, [fetchStatsData, userCalls, currentPredictionIndex]);

  const handleCallCreated = useCallback(() => {
    fetchStatsData();
    if (onCallCreated) {
      onCallCreated();
    }
  }, [fetchStatsData, onCallCreated]);

  const handlePredictionNavigate = (index: number) => {
    if (index === currentPredictionIndex || userCalls.length <= 1) return;

    setIsTransitioningPrediction(true);
    setTimeout(() => {
      setCurrentPredictionIndex(index);
      setIsTransitioningPrediction(false);
    }, 150);
  };

  const renderPredictionSection = () => {
    if (isLoadingUserCalls) {
      return (
        <div className='relative group'>
          <Card className='relative rounded-2xl min-h-[80px]'>
            <CardContent className='flex items-center justify-center h-full'>
              <Skeleton className='h-10 w-3/4' />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (userCalls.length > 0) {
      const currentCall = userCalls[currentPredictionIndex];
      const showNavigation = userCalls.length > 1;

      const goToPrevious = () => {
        const newIndex = (currentPredictionIndex - 1 + userCalls.length) % userCalls.length;
        handlePredictionNavigate(newIndex);
      };

      const goToNext = () => {
        const newIndex = (currentPredictionIndex + 1) % userCalls.length;
        handlePredictionNavigate(newIndex);
      };

      return (
        <div className='space-y-3'>
          <div className='relative min-h-[80px]'>
            {showNavigation && (
              <Button
                variant='ghost'
                size='icon'
                onClick={goToPrevious}
                className='absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full transition-transform hover:bg-transparent -ml-4'
                aria-label='Previous prediction'>
                <ChevronLeft className='h-5 w-5 text-white/80 transition-colors hover:text-amber-400' />
              </Button>
            )}

            <div
              className={cn(
                'transition-opacity duration-150',
                isTransitioningPrediction ? 'opacity-0' : 'opacity-100',
              )}>
              {currentCall && (
                <DisplayUserCall
                  key={currentCall.id}
                  call={currentCall}
                  currentTokenPrice={currentTokenPrice}
                  totalUserCalls={userCalls.length}
                />
              )}
            </div>

            {showNavigation && (
              <Button
                variant='ghost'
                size='icon'
                onClick={goToNext}
                className='absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full transition-transform hover:bg-transparent -mr-4'
                aria-label='Next prediction'>
                <ChevronRight className='h-5 w-5 text-white/80 transition-colors hover:text-amber-400' />
              </Button>
            )}
          </div>

          {showNavigation && (
            <div className='flex justify-center gap-1 pt-0'>
              {userCalls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePredictionNavigate(i)}
                  className='w-5 h-5 flex items-center justify-center cursor-pointer group'
                  aria-label={`Go to prediction ${i + 1}`}>
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all duration-200',
                      'group-hover:scale-125 group-focus:scale-125',
                      i === currentPredictionIndex
                        ? 'bg-amber-400'
                        : 'bg-zinc-700 group-hover:bg-zinc-500 group-focus:bg-zinc-500',
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          {isPriceValid && (
            <div className='pt-2'>
              <MakeCallModal
                tokenId={tokenId}
                tokenSymbol={tokenSymbol}
                currentTokenPrice={currentTokenPrice}
                onCallCreated={handleCallCreated}
                currentMarketCap={marketCap}
                circulatingSupply={circulatingSupply}
                isMakingAnotherCall={true}
              />
            </div>
          )}
        </div>
      );
    }

    if (isPriceValid) {
      return (
        <MakeCallModal
          tokenId={tokenId}
          tokenSymbol={tokenSymbol}
          currentTokenPrice={currentTokenPrice}
          onCallCreated={handleCallCreated}
          currentMarketCap={marketCap}
          circulatingSupply={circulatingSupply}
        />
      );
    }

    return (
      <div className='relative group'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
        <Card className='relative rounded-2xl opacity-60'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Make a Prediction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              Current price data is unavailable for this token, cannot make predictions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className='relative group'>
      <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
      <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-amber-600/5 to-amber-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
        <CardHeader className='pb-2 relative'>
          <div className='flex items-center mb-4'>
            <div className='h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mr-4 group-hover:bg-amber-500/20 transition-colors duration-300'>
              <LineChart className='h-5 w-5 text-amber-400' />
            </div>
            <div className='flex items-center justify-between flex-grow'>
              <CardTitle className='text-xl font-semibold text-white'>Token Calls</CardTitle>
              {tokenCallsData.length > 0 && (
                <div>
                  <Link
                    href={`/token-calls?tokenSearch=${tokenSymbol}`}
                    className='text-xs text-amber-400/70 hover:text-amber-400 px-2 py-1 rounded-md border border-amber-500/30 hover:border-amber-500/60 transition-colors duration-200'>
                    View all
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className='w-full h-0.5 bg-gradient-to-r from-amber-500/20 to-transparent'></div>
        </CardHeader>
        <CardContent className='relative pt-0 space-y-6 px-3'>
          <TokenCallsStats tokenCalls={tokenCallsData} isLoading={isLoadingStats} />
          <div>{renderPredictionSection()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
