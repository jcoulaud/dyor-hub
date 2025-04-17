'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TokenCall } from '@dyor-hub/types';
import { ChevronLeft, ChevronRight, LineChart } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  }, [fetchStatsData, userCalls.length, currentPredictionIndex]);

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
    }, 200);
  };

  // Memoize the stats component to prevent re-rendering when prediction navigation changes
  const memoizedStatsComponent = useMemo(() => {
    return <TokenCallsStats tokenCalls={tokenCallsData} isLoading={isLoadingStats} />;
  }, [tokenCallsData, isLoadingStats]);

  const renderPredictionSection = useMemo(() => {
    if (isLoadingUserCalls) {
      return (
        <div className='relative group'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300'></div>
          <Card className='relative rounded-xl min-h-[80px] bg-zinc-900/80 backdrop-blur-sm border-0'>
            <CardContent className='flex items-center justify-center h-full py-6'>
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
        <div className='space-y-2'>
          <div className='relative min-h-[80px]'>
            {showNavigation && (
              <Button
                variant='ghost'
                size='icon'
                onClick={goToPrevious}
                className='absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full transition-all hover:bg-transparent -ml-4 hover:scale-110'
                aria-label='Previous prediction'>
                <ChevronLeft className='h-5 w-5 text-white/80 transition-colors hover:text-amber-400' />
              </Button>
            )}

            <div
              className={cn(
                'transition-all duration-200',
                isTransitioningPrediction ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
              )}>
              {currentCall && (
                <DisplayUserCall
                  key={currentCall.id}
                  call={currentCall}
                  currentTokenPrice={currentTokenPrice}
                  totalUserCalls={userCalls.length}
                  currentPredictionIndex={currentPredictionIndex}
                />
              )}
            </div>

            {showNavigation && (
              <Button
                variant='ghost'
                size='icon'
                onClick={goToNext}
                className='absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full transition-all hover:bg-transparent -mr-4 hover:scale-110'
                aria-label='Next prediction'>
                <ChevronRight className='h-5 w-5 text-white/80 transition-colors hover:text-amber-400' />
              </Button>
            )}
          </div>

          {showNavigation && (
            <div className='flex justify-center gap-2'>
              {userCalls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePredictionNavigate(i)}
                  className='w-7 h-5 flex items-center justify-center cursor-pointer group'
                  aria-label={`Go to prediction ${i + 1}`}>
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200 shadow-sm',
                      'group-hover:scale-y-125 group-focus:scale-y-125',
                      i === currentPredictionIndex
                        ? 'bg-amber-400 w-5'
                        : 'bg-zinc-700 w-4 group-hover:bg-zinc-500 group-hover:w-5 group-focus:w-5 group-focus:bg-zinc-500',
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          <div className='pt-4'>
            <MakeCallModal
              tokenId={tokenId}
              tokenSymbol={tokenSymbol}
              currentTokenPrice={currentTokenPrice}
              onCallCreated={handleCallCreated}
              circulatingSupply={circulatingSupply}
              isMakingAnotherCall={true}
            />
          </div>
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
          circulatingSupply={circulatingSupply}
        />
      );
    }

    return (
      <div className='relative group'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
        <Card className='relative rounded-xl opacity-70 bg-zinc-900/80 backdrop-blur-sm border-0 shadow-md'>
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
  }, [
    isLoadingUserCalls,
    userCalls,
    currentPredictionIndex,
    isTransitioningPrediction,
    currentTokenPrice,
    isPriceValid,
    tokenId,
    tokenSymbol,
    handleCallCreated,
    circulatingSupply,
    handlePredictionNavigate,
  ]);

  return (
    <div className='relative group'>
      <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
      <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden shadow-xl'>
        <div className='absolute inset-0 bg-gradient-to-br from-amber-600/5 to-amber-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
        <CardHeader className='pb-3 relative'>
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
                    className='text-xs text-amber-400/80 hover:text-amber-400 px-3 py-1.5 rounded-md border border-amber-500/40 hover:border-amber-500/70 transition-all duration-200 hover:shadow-md hover:shadow-amber-500/10'>
                    View all
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className='w-full h-0.5 bg-gradient-to-r from-amber-500/30 to-transparent'></div>
        </CardHeader>
        <CardContent className='relative pt-0 space-y-7 px-4'>
          {/* Stats Section */}
          {memoizedStatsComponent}

          {/* User Predictions Section */}
          {userCalls.length > 0 ? (
            <div className='space-y-3'>
              <div className='flex items-center'>
                <h3 className='text-lg font-medium text-white'>Your Predictions</h3>
                <div className='h-0.5 bg-gradient-to-r from-amber-500/20 to-transparent flex-grow ml-3'></div>
              </div>
              {renderPredictionSection}
            </div>
          ) : (
            renderPredictionSection
          )}
        </CardContent>
      </Card>
    </div>
  );
}
