'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Comment, TokenCall } from '@dyor-hub/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DisplayUserCall } from './DisplayUserCall';
import { MakeCallModal } from './MakeCallModal';

interface TokenPredictionsSectionProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  isPriceValid: boolean;
  userCalls: TokenCall[];
  isLoadingUserCalls: boolean;
  onCallCreated?: () => void;
  onAddComment?: (comment: Comment) => void;
  circulatingSupply?: string;
  onPredictionIndexChange?: (index: number) => void;
}

export function TokenPredictionsSection({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  isPriceValid,
  userCalls,
  isLoadingUserCalls,
  onCallCreated,
  onAddComment,
  circulatingSupply,
  onPredictionIndexChange,
}: TokenPredictionsSectionProps) {
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [isTransitioningPrediction, setIsTransitioningPrediction] = useState(false);

  useEffect(() => {
    if (currentPredictionIndex >= userCalls.length) {
      setCurrentPredictionIndex(0);
    }

    // Notify parent of current prediction index
    if (onPredictionIndexChange && userCalls.length > 0) {
      const indexToUse = currentPredictionIndex >= userCalls.length ? 0 : currentPredictionIndex;
      onPredictionIndexChange(indexToUse);
    }
  }, [userCalls.length, currentPredictionIndex, onPredictionIndexChange]);

  const handleCallCreated = useCallback(() => {
    onCallCreated?.();
  }, [onCallCreated]);

  const handlePredictionNavigate = (index: number) => {
    if (index === currentPredictionIndex || userCalls.length <= 1) return;

    setIsTransitioningPrediction(true);
    setTimeout(() => {
      setCurrentPredictionIndex(index);
      onPredictionIndexChange?.(index);
      setIsTransitioningPrediction(false);
    }, 200);
  };

  const renderPredictionSection = useMemo(() => {
    if (isLoadingUserCalls) {
      return (
        <div className='relative group'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300'></div>
          <Card className='relative rounded-xl min-h-[80px] backdrop-blur-sm border-0 !bg-transparent'>
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
                  hideCounterInCard={true}
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
          onAddComment={onAddComment}
          circulatingSupply={circulatingSupply}
        />
      );
    }

    return (
      <div className='relative group'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
        <Card className='relative rounded-xl opacity-70 backdrop-blur-sm border-0 shadow-md !bg-transparent'>
          <CardContent className='pt-6 pb-4'>
            <p className='text-sm text-muted-foreground text-center'>
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
    onCallCreated,
    onAddComment,
    circulatingSupply,
    handlePredictionNavigate,
  ]);

  return (
    <div className='h-full flex flex-col'>
      {userCalls.length > 0 ? (
        <>
          <div className='flex-1'>{renderPredictionSection}</div>
          <div className='mt-6 pt-6 border-t border-zinc-700/30'>
            <MakeCallModal
              tokenId={tokenId}
              tokenSymbol={tokenSymbol}
              currentTokenPrice={currentTokenPrice}
              onCallCreated={handleCallCreated}
              onAddComment={onAddComment}
              circulatingSupply={circulatingSupply}
              isMakingAnotherCall={true}
            />
          </div>
        </>
      ) : (
        <div className='h-full flex flex-col'>
          <div className='flex-1 flex items-center justify-center'>{renderPredictionSection}</div>
        </div>
      )}
    </div>
  );
}
