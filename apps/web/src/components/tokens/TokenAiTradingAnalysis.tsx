'use client';

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
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
import { RangeSlider } from '@/components/ui/RangeSlider';
import { useToast } from '@/hooks/use-toast';
import type { AiTradingAnalysisRequestPayload, AiTradingAnalysisResponse } from '@/lib/api';
import { ApiError, tokens as apiTokens } from '@/lib/api';
import { DYORHUB_SYMBOL, MIN_TOKEN_HOLDING_FOR_AI_TA } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import type { TokenGatedErrorData } from '@dyor-hub/types';
import { format, max as maxDateUtil, min as minDateUtil, startOfDay } from 'date-fns';
import { AlertTriangle, ChevronRight, History, Info, Loader2, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface TokenAiTradingAnalysisProps {
  mintAddress: string;
  tokenCreationTime?: number | string | Date | null;
  tokenName?: string;
  userPlatformTokenBalance?: number;
  className?: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const InsufficientCreditsContentForAi = ({ onClose }: { onClose: () => void }) => (
  <>
    <DialogHeader className='pb-2'>
      <DialogTitle className='text-zinc-100 flex items-center gap-2'>
        <AlertTriangle className='w-5 h-5 text-amber-400' />
        Insufficient Credits
      </DialogTitle>
    </DialogHeader>
    <div className='p-6 pt-2 space-y-4'>
      <p className='text-zinc-300 text-sm'>
        You don&apos;t have enough credits to perform this AI Trading Analysis. Purchase more
        credits to continue.
      </p>
      <div className='flex gap-3 pt-2'>
        <Button
          className='flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600'
          variant='outline'
          onClick={onClose}>
          Cancel
        </Button>
        <Button
          className='flex-1 bg-primary-500 hover:bg-primary-600 text-white' // Use primary color for main action
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

export function TokenAiTradingAnalysis({
  mintAddress,
  tokenCreationTime,
  userPlatformTokenBalance,
  className,
}: TokenAiTradingAnalysisProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AiTradingAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenGatedApiError, setTokenGatedApiError] = useState<ApiError | null>(null);
  const [platformTokenGateFailed, setPlatformTokenGateFailed] = useState(false);
  const [calculatedCreditCost, setCalculatedCreditCost] = useState<number | null>(null);
  const [showInsufficientCreditsError, setShowInsufficientCreditsError] = useState(false);
  const [showTryAgainError, setShowTryAgainError] = useState(false);
  const [tryAgainErrorMessage, setTryAgainErrorMessage] = useState<string | null>(null);

  // Determine actual min and max dates for the slider
  const actualMaxDate = useMemo(() => startOfDay(new Date()), []);
  const actualMinDate = useMemo(() => {
    if (tokenCreationTime) {
      const creationDt = new Date(tokenCreationTime);
      if (!isNaN(creationDt.getTime())) {
        const minCandidate = startOfDay(creationDt);
        return minCandidate > actualMaxDate ? actualMaxDate : minCandidate;
      }
    }
    return actualMaxDate;
  }, [tokenCreationTime, actualMaxDate]);

  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>(() => {
    // Default to the full possible range
    let fromInitial = actualMinDate;
    const toInitial = actualMaxDate;

    if (fromInitial > toInitial) {
      fromInitial = toInitial;
    }
    return { from: fromInitial, to: toInitial };
  });

  useEffect(() => {
    if (!isModalOpen) {
      setError(null);
      setTokenGatedApiError(null);
      setPlatformTokenGateFailed(false);
      setAnalysisData(null);
      setCalculatedCreditCost(null);
      setShowInsufficientCreditsError(false);
      setShowTryAgainError(false);
      setTryAgainErrorMessage(null);
      setDateRange({ from: actualMinDate, to: actualMaxDate });
    }
  }, [isModalOpen, actualMinDate, actualMaxDate]);

  useEffect(() => {
    setDateRange({ from: actualMinDate, to: actualMaxDate });
  }, [actualMinDate, actualMaxDate]);

  const handleSliderChange = (newTimestamps: readonly number[]) => {
    if (newTimestamps.length === 2) {
      let newFrom = startOfDay(new Date(newTimestamps[0]));
      let newTo = startOfDay(new Date(newTimestamps[1]));

      if (newFrom > newTo) {
        if (newTimestamps[0] === dateRange.from.getTime()) {
          newFrom = newTo;
        } else {
          newTo = newFrom;
        }
      }
      newFrom = maxDateUtil([newFrom, actualMinDate]);
      newTo = minDateUtil([newTo, actualMaxDate]);

      setDateRange({ from: newFrom, to: newTo });
    }
  };

  const handleOpenModal = async () => {
    if (!isAuthenticated && !authLoading) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to use the AI Trading Analysis feature.',
        variant: 'destructive',
      });
      return;
    }
    setIsModalOpen(true);

    if (isAuthenticated) {
      if (
        typeof userPlatformTokenBalance === 'number' &&
        userPlatformTokenBalance < MIN_TOKEN_HOLDING_FOR_AI_TA
      ) {
        setPlatformTokenGateFailed(true);
        return;
      }
      setIsCostLoading(true);
      try {
        const costData = await apiTokens.getAiTradingAnalysisCost(mintAddress);
        setCalculatedCreditCost(costData.creditCost);
      } catch (err) {
        const caughtError = err as ApiError;
        setError(
          caughtError.message || 'Failed to fetch credit cost. Please try opening the modal again.',
        );
      } finally {
        setIsCostLoading(false);
      }
    }
  };

  const handleSubmitAnalysis = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Please select a valid date range.');
      toast({
        title: 'Date Range Required',
        description: 'Please select a start and end date.',
        variant: 'destructive',
      });
      return;
    }
    if (!mintAddress) {
      setError('Token address is missing.');
      return;
    }
    if (calculatedCreditCost === null && !isCostLoading) {
      setError('Credit cost not determined. Please re-open the modal.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTokenGatedApiError(null);
    setAnalysisData(null);

    const timeFromInSeconds = Math.floor(dateRange.from.getTime() / 1000);
    const timeToInSeconds = Math.floor(dateRange.to.getTime() / 1000);

    try {
      const payload: AiTradingAnalysisRequestPayload = {
        tokenAddress: mintAddress,
        timeFrom: timeFromInSeconds,
        timeTo: timeToInSeconds,
      };
      const result = await apiTokens.getAiTradingAnalysis(payload);
      setAnalysisData(result);
      toast({
        title: 'Analysis Complete',
        description: 'AI trading insights are ready.',
      });
    } catch (err) {
      const caughtError = err as ApiError;
      console.error('AI Trading Analysis error:', caughtError);
      const errorData = caughtError.data as
        | {
            message?: string;
            details?: TokenGatedErrorData & { isTokenGatedError?: boolean } & { code?: string };
          }
        | undefined;

      setShowTryAgainError(false);
      setTryAgainErrorMessage(null);

      if (caughtError.status === 403 && errorData?.details?.isTokenGatedError) {
        setTokenGatedApiError(caughtError);
        setShowInsufficientCreditsError(false);
      } else if (
        caughtError.status === 403 &&
        (caughtError.message?.toLowerCase().includes('insufficient credits') ||
          (typeof errorData?.details === 'object' &&
            errorData.details &&
            'code' in errorData.details &&
            errorData.details.code === 'INSUFFICIENT_CREDITS'))
      ) {
        setShowInsufficientCreditsError(true);
        setError(null);
        toast({
          title: 'Insufficient Credits',
          description: 'Not enough credits for this analysis.',
          variant: 'destructive',
        });
      } else {
        const specificMessage =
          caughtError.message?.includes('OpenAI API error') ||
          caughtError.message?.includes('Error getting structured analysis from LLM')
            ? 'The AI analysis failed. Your credits have not been deducted. Please try again.'
            : 'An error occurred while performing the AI analysis. Your credits have not been deducted. Please try again.';

        setTryAgainErrorMessage(specificMessage);
        setShowTryAgainError(true);
        setError(null);
        setTokenGatedApiError(null);
        setShowInsufficientCreditsError(false);
        toast({
          title: 'Analysis Failed',
          description:
            errorData?.message || caughtError.message || 'Could not retrieve AI trading analysis.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayCreditCost =
    calculatedCreditCost !== null ? `${calculatedCreditCost} Credits` : '...';

  const formattedDateRangeLabel = `Selected: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;

  if (authLoading && !isModalOpen) {
    return (
      <div className={className}>
        <div className='mb-2'>
          <p className='text-sm font-medium text-zinc-300'>AI Technical Analysis</p>
        </div>
        <Button
          variant='outline'
          size='sm'
          disabled={true}
          className='w-full bg-zinc-900/60 border-zinc-700/50 text-zinc-200 flex items-center justify-between animate-pulse'>
          <div className='flex items-center'>
            <Sparkles className='w-4 h-4 mr-2 text-zinc-400' />
            <span className='font-medium text-zinc-400'>View AI Trading Analysis</span>
          </div>
          <ChevronRight className='w-4 h-4 ml-auto text-zinc-400' />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className='mb-2'>
        <p className='text-sm font-medium text-zinc-300'>AI Technical Analysis</p>
      </div>
      <Button
        onClick={handleOpenModal}
        variant='outline'
        size='sm'
        disabled={authLoading}
        className='w-full bg-zinc-900/60 border-zinc-700/50 hover:bg-zinc-800/80 text-zinc-200 flex items-center justify-between'>
        <div className='flex items-center'>
          <Sparkles className='w-4 h-4 mr-2 text-zinc-200' />
          <span className='font-medium'>View AI Trading Analysis</span>
        </div>
        <ChevronRight className='w-4 h-4 ml-auto text-zinc-200' />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='sm:max-w-lg bg-zinc-900 border-zinc-700 text-zinc-50'>
          {showInsufficientCreditsError ? (
            <InsufficientCreditsContentForAi onClose={() => setIsModalOpen(false)} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center'>
                  <Sparkles className='w-5 h-5 mr-2 text-primary-400' />
                  AI Powered Trading Analysis
                </DialogTitle>
                {/* Show description only in the initial form state */}
                {!analysisData &&
                  !isLoading &&
                  !platformTokenGateFailed &&
                  !tokenGatedApiError &&
                  !error &&
                  !showTryAgainError && (
                    <DialogDescription>
                      Select the date range for the analysis. The AI will analyze price action,
                      momentum, and key support/resistance zones.
                    </DialogDescription>
                  )}
                {/* Show description for the results state */}
                {analysisData && analysisData.analysisOutput && !showTryAgainError && (
                  <DialogDescription>
                    Here is your AI-powered trading analysis. Review the insights below.
                  </DialogDescription>
                )}
              </DialogHeader>

              {!isAuthenticated && !authLoading && (
                <div className='my-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-md text-yellow-300 flex items-center'>
                  <AlertTriangle className='h-5 w-5 mr-3 shrink-0' />
                  <div>
                    <p className='font-semibold'>Authentication Required</p>
                    <p className='text-sm'>You must be logged in to perform this analysis.</p>
                  </div>
                </div>
              )}

              {platformTokenGateFailed && (
                <div className='py-6 px-4 text-center text-sm text-zinc-300 space-y-3'>
                  <Lock className='w-10 h-10 text-orange-400 mx-auto mb-3' />
                  <h3 className='text-lg font-semibold text-orange-400'>
                    AI Trading Analysis - Access Gated
                  </h3>
                  <p>Access to this feature is token-gated.</p>
                  <p className='font-semibold mt-2 p-2 bg-zinc-800/50 rounded-md border border-zinc-700'>
                    Required: {MIN_TOKEN_HOLDING_FOR_AI_TA.toLocaleString()} {DYORHUB_SYMBOL} <br />
                    Your Balance: {userPlatformTokenBalance?.toLocaleString() || '0'}{' '}
                    {DYORHUB_SYMBOL}
                  </p>
                  <p className='text-xs text-zinc-400 pt-2'>
                    Please ensure your primary connected wallet holds the required amount of{' '}
                    {DYORHUB_SYMBOL}.
                  </p>
                  <div className='mt-6'>
                    <Button
                      asChild
                      variant='secondary'
                      size='sm'
                      onClick={() => setIsModalOpen(false)}>
                      <Link href='/account/wallet'>Manage Wallet</Link>
                    </Button>
                  </div>
                </div>
              )}

              {tokenGatedApiError && !platformTokenGateFailed && (
                <TokenGatedMessage error={tokenGatedApiError} featureName='AI Trading Analysis' />
              )}

              {showTryAgainError && tryAgainErrorMessage && (
                <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex flex-col items-center text-center space-y-3'>
                  <AlertTriangle className='h-8 w-8 mb-2' />
                  <p className='font-semibold'>Analysis Error</p>
                  <p className='text-sm'>{tryAgainErrorMessage}</p>
                </div>
              )}

              {error &&
                !analysisData &&
                !platformTokenGateFailed &&
                !tokenGatedApiError &&
                !showTryAgainError && (
                  <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex items-center'>
                    <AlertTriangle className='h-5 w-5 mr-2' />
                    {error}
                  </div>
                )}

              {isLoading && !analysisData && (
                <div className='flex flex-col items-center justify-center h-40'>
                  <Loader2 className='h-12 w-12 animate-spin text-teal-400' />
                  <p className='mt-4 text-zinc-300'>Conjuring insights from the digital ether...</p>
                </div>
              )}

              {analysisData && analysisData.analysisOutput && (
                <div className='mt-4 space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 custom-scrollbar'>
                  <h3 className='text-lg font-semibold text-zinc-100'>AI Analysis Results:</h3>
                  {analysisData.analysisOutput.unfilteredTruth && (
                    <div className='p-3 rounded-md bg-zinc-800/70'>
                      <h4 className='font-medium text-zinc-200 mb-1'>Summary:</h4>
                      <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                        {analysisData.analysisOutput.unfilteredTruth}
                      </p>
                    </div>
                  )}
                  {analysisData.analysisOutput.decodedStory && (
                    <div className='space-y-3'>
                      {analysisData.analysisOutput.decodedStory.priceJourney && (
                        <div className='p-3 rounded-md bg-zinc-800/70'>
                          <h4 className='font-medium text-zinc-200 mb-1'>Price Journey:</h4>
                          <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                            {analysisData.analysisOutput.decodedStory.priceJourney}
                          </p>
                        </div>
                      )}
                      {analysisData.analysisOutput.decodedStory.momentumMeter && (
                        <div className='p-3 rounded-md bg-zinc-800/70'>
                          <h4 className='font-medium text-zinc-200 mb-1'>Momentum Meter:</h4>
                          <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                            {analysisData.analysisOutput.decodedStory.momentumMeter}
                          </p>
                        </div>
                      )}
                      {analysisData.analysisOutput.decodedStory.battleZones && (
                        <div className='p-3 rounded-md bg-zinc-800/70'>
                          <h4 className='font-medium text-zinc-200 mb-1'>Battle Zones:</h4>
                          <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                            {analysisData.analysisOutput.decodedStory.battleZones}
                          </p>
                        </div>
                      )}
                      {analysisData.analysisOutput.decodedStory.volumeSignals && (
                        <div className='p-3 rounded-md bg-zinc-800/70'>
                          <h4 className='font-medium text-zinc-200 mb-1'>Volume Signals:</h4>
                          <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                            {analysisData.analysisOutput.decodedStory.volumeSignals}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {analysisData.analysisOutput.inferredSentiment && (
                    <div className='p-3 rounded-md bg-zinc-800/70'>
                      <h4 className='font-medium text-zinc-200 mb-1'>Inferred Sentiment:</h4>
                      <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                        {analysisData.analysisOutput.inferredSentiment}
                      </p>
                    </div>
                  )}
                  {analysisData.analysisOutput.bottomLine && (
                    <div className='p-3 rounded-md bg-zinc-800/70'>
                      <h4 className='font-medium text-zinc-200 mb-1'>Bottom Line:</h4>
                      <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                        {analysisData.analysisOutput.bottomLine}
                      </p>
                    </div>
                  )}
                  {/* Add a disclaimer for the AI analysis results */}
                  <div className='mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-500'>
                    <Info
                      size={14}
                      className='inline-block mr-1.5 relative -top-px text-zinc-400'
                    />
                    AI-generated analysis is for informational purposes only and not financial
                    advice. Market conditions can change rapidly. Always do your own research
                    (DYOR).
                  </div>
                </div>
              )}

              {!analysisData &&
                !isLoading &&
                !platformTokenGateFailed &&
                !tokenGatedApiError &&
                !error &&
                !showTryAgainError && (
                  <div className='mt-6 space-y-4'>
                    <div>
                      <label
                        htmlFor='date-range-slider'
                        className='block text-sm font-medium text-zinc-300 mb-1'>
                        Date Range:{' '}
                        <span className='font-normal text-zinc-400'>{formattedDateRangeLabel}</span>
                      </label>
                      {(() => {
                        const sliderKey = `${actualMinDate.getTime()}-${actualMaxDate.getTime()}`;
                        const sliderRenderProps = {
                          id: 'date-range-slider',
                          value: [dateRange.from.getTime(), dateRange.to.getTime()] as [
                            number,
                            number,
                          ],
                          onValueChange: handleSliderChange,
                          min: actualMinDate.getTime(),
                          max:
                            actualMinDate.getTime() === actualMaxDate.getTime()
                              ? actualMaxDate.getTime() + DAY_IN_MS
                              : actualMaxDate.getTime(),
                          step: DAY_IN_MS,
                          minStepsBetweenThumbs: 0, // Allow selecting a single day
                          disabled: isLoading || isCostLoading,
                          'aria-label': 'Date range slider for AI analysis',
                        };
                        console.log(
                          '[TokenAiTradingAnalysis] Rendering RangeSlider with key:',
                          sliderKey,
                          'and props:',
                          sliderRenderProps,
                        );
                        return <RangeSlider key={sliderKey} {...sliderRenderProps} />;
                      })()}
                    </div>
                    <div className='text-xs text-zinc-500 p-2 bg-zinc-800/30 rounded-md border border-zinc-700/30 flex items-start'>
                      <Info size={16} className='mr-2 mt-0.5 shrink-0 text-teal-500' />
                      <span>
                        The AI will analyze chart data for the selected period. Analysis quality
                        depends on data availability. Insights are not financial advice.
                      </span>
                    </div>
                  </div>
                )}

              <DialogFooter className='mt-6 sm:justify-between'>
                <DialogClose asChild>
                  <Button variant='outline' className='border-zinc-600 hover:bg-zinc-700'>
                    Cancel
                  </Button>
                </DialogClose>

                {(() => {
                  if (showInsufficientCreditsError) {
                    return (
                      <Button asChild className='bg-primary-500 hover:bg-primary-600 text-white'>
                        <Link href='/account/credits'>Top Up Credits</Link>
                      </Button>
                    );
                  }
                  if (showTryAgainError) {
                    return (
                      <Button
                        onClick={handleSubmitAnalysis}
                        disabled={isLoading}
                        className='bg-amber-500 hover:bg-amber-600 text-white'>
                        {isLoading ? (
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                        ) : (
                          <History className='h-4 w-4 mr-2' />
                        )}
                        Try Again
                      </Button>
                    );
                  }
                  if (!analysisData && !platformTokenGateFailed && !tokenGatedApiError && !error) {
                    return (
                      <Button
                        onClick={handleSubmitAnalysis}
                        disabled={
                          isLoading ||
                          isCostLoading ||
                          calculatedCreditCost === null ||
                          !dateRange.from ||
                          !dateRange.to
                        }
                        className='bg-teal-600 hover:bg-teal-700 text-white'>
                        {isLoading || isCostLoading ? (
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                        ) : (
                          <Sparkles className='h-4 w-4 mr-2' />
                        )}
                        {isLoading
                          ? 'Analyzing...'
                          : isCostLoading
                            ? 'Fetching Cost...'
                            : `Analyze (${displayCreditCost})`}
                      </Button>
                    );
                  }
                  return null;
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TokenAiTradingAnalysis;
