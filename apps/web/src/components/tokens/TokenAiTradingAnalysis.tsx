'use client';

const formatTokenAmount = {
  format: (amount: number | null | undefined, symbol?: string) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `${amount.toLocaleString()} ${symbol || ''}`.trim();
  },
};

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
import { Progress } from '@/components/ui/progress';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { useToast } from '@/hooks/use-toast';
import type {
  AiTradingAnalysisRequestPayload,
  AiTradingAnalysisResponse,
  ChartWhispererSchemaForWeb,
} from '@/lib/api';
import { API_BASE_URL, ApiError, tokens as apiTokens } from '@/lib/api';
import { DYORHUB_SYMBOL, MIN_TOKEN_HOLDING_FOR_AI_TA } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import type { TokenGatedErrorData } from '@dyor-hub/types';
import { endOfDay, format, max as maxDateUtil, min as minDateUtil, startOfDay } from 'date-fns';
import {
  AlertTriangle,
  BarChart4,
  Calendar,
  ChevronRight,
  DollarSign,
  History,
  Info,
  LineChart,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface TradingAnalysisProgressEvent {
  status: 'analyzing' | 'complete' | 'error' | 'queued';
  message?: string;
  error?: string;
  analysisData?: ChartWhispererSchemaForWeb;
  progress?: number; // 0-100 percentage
  stage?: string; // e.g., 'Fetching price data', 'Analyzing patterns', 'Generating insights'
  sessionId?: string;
}

interface TokenAiTradingAnalysisProps {
  mintAddress: string;
  tokenCreationTime?: number | string | Date | null;
  tokenName?: string;
  userPlatformTokenBalance?: number;
  className?: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const InsufficientCreditsContent = ({ onClose }: { onClose: () => void }) => (
  <>
    <DialogHeader className='pb-2'>
      <DialogTitle className='text-zinc-100 flex items-center gap-2'>
        <AlertTriangle className='w-5 h-5 text-amber-400' />
        Insufficient Credits
      </DialogTitle>
    </DialogHeader>
    <div className='p-6 space-y-4'>
      <p className='text-zinc-300'>
        You don&apos;t have enough credits to perform this analysis. Purchase more credits to
        continue.
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

export function TokenAiTradingAnalysis({
  mintAddress,
  tokenCreationTime,
  userPlatformTokenBalance,
  className,
}: TokenAiTradingAnalysisProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AiTradingAnalysisResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tokenGatedApiError, setTokenGatedApiError] = useState<ApiError | null>(null);
  const [isFreeTier, setIsFreeTier] = useState(false);
  const [calculatedCreditCost, setCalculatedCreditCost] = useState<number | null>(null);
  const [showInsufficientCreditsError, setShowInsufficientCreditsError] = useState(false);
  const [showTryAgainError, setShowTryAgainError] = useState(false);
  const [tryAgainErrorMessage, setTryAgainErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const currentAnalysisSessionId = useRef<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<TradingAnalysisProgressEvent | null>(
    null,
  );
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);

  // Keep track of if we've handled an error for the current session
  const errorHandledForSession = useRef<Record<string, boolean>>({});

  // Determine actual min and max dates for the slider
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const actualMaxDate = useMemo(() => endOfDay(new Date()), []);

  const actualMinDate = useMemo(() => {
    if (tokenCreationTime) {
      const creationDt = new Date(tokenCreationTime);
      if (!isNaN(creationDt.getTime())) {
        const minCandidate = startOfDay(creationDt);
        return minCandidate > todayStart ? todayStart : minCandidate;
      }
    }
    return todayStart;
  }, [tokenCreationTime, todayStart]);

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

  const [modalOpenTime, setModalOpenTime] = useState<number | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      setModalOpenTime(Date.now());
    } else {
      setModalOpenTime(null);
    }
  }, [isModalOpen]);

  const hasModalBeenOpenLongEnough = modalOpenTime && Date.now() - modalOpenTime > 300;

  const resetState = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('trading_analysis_progress');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    currentAnalysisSessionId.current = null;

    errorHandledForSession.current = {};

    setError(null);
    setTokenGatedApiError(null);
    setIsFreeTier(false);
    setAnalysisData(null);
    setCalculatedCreditCost(null);
    setShowInsufficientCreditsError(false);
    setShowTryAgainError(false);
    setTryAgainErrorMessage(null);
    setDateRange({ from: actualMinDate, to: actualMaxDate });
    setAnalysisProgress(null);
    setHasShownCompletionToast(false);
    setIsLoading(false);
    setIsCostLoading(false);
  }, [actualMinDate, actualMaxDate]);

  useEffect(() => {
    if (!isModalOpen) {
      const resetTimer = setTimeout(() => {
        resetState();
      }, 150);

      return () => {
        clearTimeout(resetTimer);
      };
    }
  }, [isModalOpen, resetState]);

  useEffect(() => {
    setDateRange({ from: actualMinDate, to: actualMaxDate });
  }, [actualMinDate, actualMaxDate]);

  // WebSocket setup
  useEffect(() => {
    let isMounted = true;

    // Only connect when dialog is open and user is authenticated
    if (!isModalOpen || !isAuthenticated || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // If already connected, skip
    if (socketRef.current?.connected) {
      return;
    }

    // Clean up existing socket if needed
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Connect to WebSocket
    const socketUrl = `${API_BASE_URL}/analysis`;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Handle socket events
    socket.on('trading_analysis_progress', (data: TradingAnalysisProgressEvent) => {
      if (!isMounted) return;

      if (
        !currentAnalysisSessionId.current ||
        (data.sessionId && data.sessionId !== currentAnalysisSessionId.current)
      ) {
        return; // Ignore events from other sessions
      }

      // Handle error state only once per session
      if (data.status === 'error' && data.sessionId) {
        // If we've already handled an error for this session, ignore
        if (errorHandledForSession.current[data.sessionId]) {
          return;
        }

        // Mark this session as having an error handled
        errorHandledForSession.current[data.sessionId] = true;

        // Clear loading state
        if (isMounted) setIsLoading(false);

        // Check for insufficient credits error
        if (
          data.message?.toLowerCase().includes('insufficient credits') ||
          data.error?.toLowerCase().includes('insufficient credits')
        ) {
          if (isMounted) {
            setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
            setShowInsufficientCreditsError(true);
            setShowTryAgainError(false);
            setTryAgainErrorMessage(null);
            setAnalysisProgress(null);
          }
          return;
        }

        // Handle other errors
        if (isMounted) {
          setTryAgainErrorMessage(data.message || 'Analysis failed');
          setShowTryAgainError(true);
          setShowInsufficientCreditsError(false);

          toast({
            title: 'Analysis Failed',
            description: data.message || data.error || 'Could not complete AI analysis.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (isMounted) setAnalysisProgress(data);

      // Handle completion
      if (
        data.status === 'complete' &&
        data.analysisData &&
        !hasShownCompletionToast &&
        isMounted
      ) {
        setHasShownCompletionToast(true);
        setAnalysisData({ analysisOutput: data.analysisData });
        setIsLoading(false);
        toast({
          title: 'Analysis Complete',
          description: 'AI trading insights are ready.',
        });
      }
    });

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isModalOpen, isAuthenticated, user?.id, toast, hasShownCompletionToast]);

  useEffect(() => {
    let isActive = true;

    if (isModalOpen && isAuthenticated && user) {
      if (isActive) {
        setError(null);
        setShowInsufficientCreditsError(false);
      }

      const eligibleForFreeTier =
        typeof userPlatformTokenBalance === 'number' &&
        userPlatformTokenBalance >= MIN_TOKEN_HOLDING_FOR_AI_TA;

      if (isActive) {
        setIsFreeTier(eligibleForFreeTier);
      }

      if (eligibleForFreeTier) {
        if (isActive) {
          setCalculatedCreditCost(0);
          setIsCostLoading(false);
        }
      } else {
        // Must pay with credits
        if (isActive) {
          setCalculatedCreditCost(null);
          setIsCostLoading(true);
        }
        apiTokens
          .getAiTradingAnalysisCost(mintAddress)
          .then((costData) => {
            if (isActive) {
              setCalculatedCreditCost(costData.creditCost);
              if (user && typeof user.credits === 'number' && user.credits < costData.creditCost) {
                setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
                setShowInsufficientCreditsError(true);
              }
            }
          })
          .catch((errCatch) => {
            if (isActive) {
              const caughtError = errCatch as ApiError;
              if (
                caughtError.status === 402 ||
                caughtError.message?.toLowerCase().includes('insufficient credits')
              ) {
                setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
                setShowInsufficientCreditsError(true);
              } else {
                setError(caughtError);
              }
            }
          })
          .finally(() => {
            if (isActive) {
              setIsCostLoading(false);
            }
          });
      }
    } else if (isModalOpen && !isAuthenticated) {
      if (isActive) {
        setError(null);
        setShowInsufficientCreditsError(false);
        setIsFreeTier(false);
        setCalculatedCreditCost(null);
        setIsCostLoading(false);
      }
    }

    return () => {
      isActive = false;
    };
  }, [
    isModalOpen,
    isAuthenticated,
    user,
    userPlatformTokenBalance,
    mintAddress,
    MIN_TOKEN_HOLDING_FOR_AI_TA,
  ]);

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

    setError(null);
    setShowInsufficientCreditsError(false);
    setShowTryAgainError(false);
    setTryAgainErrorMessage(null);
    setTokenGatedApiError(null);

    resetState();

    setIsModalOpen(true);
  };

  const handleSubmitAnalysis = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError(new ApiError(400, 'Please select a valid date range.'));
      toast({
        title: 'Date Range Required',
        description: 'Please select a start and end date.',
        variant: 'destructive',
      });
      return;
    }
    if (!mintAddress) {
      setError(new ApiError(400, 'Token address is missing.'));
      return;
    }
    if (!isFreeTier && calculatedCreditCost === null && !isCostLoading) {
      setError(new ApiError(400, 'Credit cost not determined. Please re-open the modal.'));
      toast({
        title: 'Cost Error',
        description:
          'Could not determine analysis cost. Please try closing and re-opening the dialog.',
        variant: 'destructive',
      });
      return;
    }
    if (!isFreeTier && showInsufficientCreditsError) {
      setIsLoading(false);
      return;
    }

    // Clear all previous errors and states for a new submission attempt
    setIsLoading(true);
    setError(null);
    setTokenGatedApiError(null);
    setAnalysisProgress(null);
    setHasShownCompletionToast(false);
    errorHandledForSession.current = {};

    if (!isFreeTier && !showInsufficientCreditsError) {
      if (
        user &&
        typeof user.credits === 'number' &&
        typeof calculatedCreditCost === 'number' &&
        user.credits < calculatedCreditCost
      ) {
        setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
        setShowInsufficientCreditsError(true);
        setIsLoading(false);
        return;
      }
      if (calculatedCreditCost === null) {
        try {
          setIsCostLoading(true);
          const freshCostData = await apiTokens.getAiTradingAnalysisCost(mintAddress);
          setCalculatedCreditCost(freshCostData.creditCost);
          setIsCostLoading(false);
          if (user && typeof user.credits === 'number' && user.credits < freshCostData.creditCost) {
            setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
            setShowInsufficientCreditsError(true);
            setIsLoading(false);
            return;
          }
        } catch (creditErr) {
          setIsCostLoading(false);
          const creditError = creditErr as ApiError;
          if (
            creditError.status === 402 ||
            creditError.message?.toLowerCase().includes('insufficient credits')
          ) {
            setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
            setShowInsufficientCreditsError(true);
          } else {
            setTryAgainErrorMessage(
              creditError.message || 'Could not verify analysis cost. Please try again.',
            );
            setShowTryAgainError(true);
          }
          setIsLoading(false);
          return;
        }
      }
    }

    const timeFromInSeconds = Math.floor(dateRange.from.getTime() / 1000);
    const timeToInSeconds = Math.floor(dateRange.to.getTime() / 1000);

    // Generate new session ID for this analysis
    const newSessionId = Math.random().toString(36).substring(2, 15);
    currentAnalysisSessionId.current = newSessionId;

    try {
      const payload: AiTradingAnalysisRequestPayload = {
        tokenAddress: mintAddress,
        timeFrom: timeFromInSeconds,
        timeTo: timeToInSeconds,
        sessionId: newSessionId,
      };

      // Start the analysis, but don't wait for it to complete
      await apiTokens.startAiTradingAnalysis(payload);

      // Update progress UI
      setAnalysisProgress({
        status: 'analyzing',
        message: 'Initiating analysis...',
        progress: 5,
        sessionId: newSessionId,
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

      setIsLoading(false);
      setShowTryAgainError(false);
      setTryAgainErrorMessage(null);
      setAnalysisProgress(null);

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
        setError(new ApiError(402, 'Insufficient credits for AI Trading Analysis'));
        setShowInsufficientCreditsError(true);
      } else {
        const specificMessage =
          caughtError.message?.includes('timeout') ||
          caughtError.message?.includes('Request timeout')
            ? 'The analysis is taking longer than expected. This could be due to the complexity of the data or server load. Your credits have not been deducted. Please try again.'
            : caughtError.message?.includes('OpenAI API error') ||
                caughtError.message?.includes('Error getting structured analysis from LLM')
              ? 'The AI analysis failed. Your credits have not been deducted. Please try again.'
              : 'An error occurred while performing the AI analysis. Your credits have not been deducted. Please try again.';

        setTryAgainErrorMessage(specificMessage);
        setShowTryAgainError(true);
        setError(null);
        setTokenGatedApiError(null);
        setShowInsufficientCreditsError(false);
      }
    } finally {
      if (!socketRef.current?.connected) {
        setIsLoading(false);
      }
    }
  };

  const displayCreditCost = isFreeTier
    ? 'Free'
    : calculatedCreditCost !== null
      ? `${calculatedCreditCost} Credits`
      : isCostLoading
        ? '...'
        : 'Not available';

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
      <Button
        onClick={handleOpenModal}
        variant='outline'
        size='lg'
        disabled={authLoading}
        className='w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-blue-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg'>
        <div className='flex items-center'>
          <div className='w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center mr-3'>
            <Sparkles className='w-5 h-5 text-blue-100' />
          </div>
          <span className='font-semibold'>AI Trading Analysis</span>
        </div>
        <ChevronRight className='w-5 h-5 text-blue-400' />
      </Button>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open && !isModalOpen) {
            setError(null);
            setShowInsufficientCreditsError(false);
            setShowTryAgainError(false);
            setTryAgainErrorMessage(null);
            setTokenGatedApiError(null);
          }

          setIsModalOpen(open);
        }}>
        <DialogContent className='max-w-4xl bg-zinc-900/95 border-zinc-700/50 backdrop-blur-md text-zinc-50 data-[state=open]:animate-contentShow'>
          {error?.status === 402 && hasModalBeenOpenLongEnough ? (
            <InsufficientCreditsContent onClose={() => setIsModalOpen(false)} />
          ) : showInsufficientCreditsError && hasModalBeenOpenLongEnough ? (
            <InsufficientCreditsContent onClose={() => setIsModalOpen(false)} />
          ) : (
            <>
              <DialogHeader className='pb-2'>
                <DialogTitle className='text-zinc-100 flex items-center'>
                  <Sparkles className='w-5 h-5 mr-2 text-teal-400' />
                  AI Powered Trading Analysis
                </DialogTitle>
                {/* Show description only in the initial form state */}
                {!analysisData &&
                  !isLoading &&
                  !tokenGatedApiError &&
                  !error &&
                  !showTryAgainError &&
                  !showInsufficientCreditsError && (
                    <DialogDescription className='text-sm text-zinc-400 pt-1'>
                      The AI will analyze trading metrics, price patterns, volume trends, market
                      sentiment, and key support/resistance zones.
                      {isAuthenticated &&
                      userPlatformTokenBalance !== undefined &&
                      userPlatformTokenBalance !== null ? (
                        isFreeTier ? (
                          <p className='text-sm text-emerald-400 mt-1'>
                            <Info size={16} className='inline mr-1' />
                            This analysis is FREE for you! (You hold{' '}
                            {formatTokenAmount.format(userPlatformTokenBalance)}/
                            {formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_AI_TA)} required
                            $DYORHUB)
                          </p>
                        ) : (
                          <div className='text-amber-400 flex items-center gap-1 mt-1 text-sm'>
                            <Info size={16} className='inline' /> Hold{' '}
                            {formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_AI_TA, DYORHUB_SYMBOL)}{' '}
                            for free analysis. Your balance:{' '}
                            {formatTokenAmount.format(userPlatformTokenBalance, DYORHUB_SYMBOL)}.
                          </div>
                        )
                      ) : isAuthenticated && typeof userPlatformTokenBalance === 'undefined' ? (
                        <span className='block mt-1 text-zinc-400 text-sm'>
                          Loading token balance...
                        </span>
                      ) : isAuthenticated ? (
                        <div className='text-amber-400 flex items-center gap-1 mt-1 text-sm'>
                          <Info size={16} className='inline' /> Hold{' '}
                          {formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_AI_TA, DYORHUB_SYMBOL)}{' '}
                          for free analysis.
                        </div>
                      ) : (
                        <div className='text-amber-400 flex items-center gap-1 mt-1 text-sm'>
                          <Info size={16} className='inline' /> Log in and hold{' '}
                          {formatTokenAmount.format(MIN_TOKEN_HOLDING_FOR_AI_TA, DYORHUB_SYMBOL)}{' '}
                          for free analysis.
                        </div>
                      )}
                    </DialogDescription>
                  )}
                {/* Show description for the results state */}
                {analysisData &&
                  typeof analysisData.analysisOutput === 'object' &&
                  analysisData.analysisOutput !== null &&
                  !showTryAgainError && (
                    <DialogDescription className='text-sm text-zinc-400 pt-1'>
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

              {tokenGatedApiError && (
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
                !tokenGatedApiError &&
                !showTryAgainError &&
                error.status !== 402 && (
                  <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex items-center'>
                    <AlertTriangle className='h-5 w-5 mr-2' />
                    {error.message}
                  </div>
                )}

              {isLoading && !analysisData && (
                <div className='flex flex-col items-center justify-center py-8'>
                  {analysisProgress ? (
                    <div className='w-full max-w-md space-y-4'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-zinc-300 font-medium'>
                          {analysisProgress.stage || 'Analyzing token data...'}
                        </span>
                        <span className='text-zinc-400 text-sm'>
                          {analysisProgress.progress
                            ? `${Math.round(analysisProgress.progress)}%`
                            : ''}
                        </span>
                      </div>

                      <Progress
                        value={analysisProgress.progress || 0}
                        className='h-1.5 bg-zinc-800'
                      />
                    </div>
                  ) : (
                    <>
                      <Loader2 className='h-12 w-12 animate-spin text-teal-400' />
                      <p className='mt-4 text-zinc-300'>Analyzing token data, please wait...</p>
                    </>
                  )}
                </div>
              )}

              {analysisData &&
                typeof analysisData.analysisOutput === 'object' &&
                analysisData.analysisOutput !== null && (
                  <div className='mt-4 space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600'>
                    <h3 className='text-base font-semibold text-zinc-100'>
                      AI Analysis Results:{' '}
                      <span className='text-zinc-400 text-sm font-normal'>
                        {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                        {format(dateRange.to, 'MMM d, yyyy')}
                      </span>
                    </h3>

                    {analysisData.analysisOutput.unfilteredTruth && (
                      <div className='mb-5'>
                        <h4 className='text-sm font-medium text-zinc-200 mb-1.5 text-teal-400 border-b border-zinc-800 pb-1'>
                          Summary
                        </h4>
                        <p className='text-sm text-zinc-300 whitespace-pre-wrap'>
                          {analysisData.analysisOutput.unfilteredTruth}
                        </p>
                      </div>
                    )}

                    {analysisData.analysisOutput.ratings && (
                      <div className='mb-4 pt-2 border-t border-zinc-800'>
                        <h4 className='text-sm font-medium text-zinc-200 mb-3 flex items-center'>
                          <Sparkles className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                          <span className='text-teal-400'>Trading Metrics (1-10)</span>
                        </h4>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 text-sm'>
                          {analysisData.analysisOutput.ratings.marketcapStrength && (
                            <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30'>
                              <div className='flex justify-between items-center mb-1'>
                                <span className='text-zinc-300'>Marketcap Strength</span>
                                <span className='text-lg font-bold text-teal-400'>
                                  {analysisData.analysisOutput.ratings.marketcapStrength.score}/10
                                </span>
                              </div>
                              <p className='text-xs text-zinc-400'>
                                {analysisData.analysisOutput.ratings.marketcapStrength.explanation}
                              </p>
                            </div>
                          )}

                          {analysisData.analysisOutput.ratings.momentum && (
                            <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30'>
                              <div className='flex justify-between items-center mb-1'>
                                <span className='text-zinc-300'>Momentum</span>
                                <span className='text-lg font-bold text-teal-400'>
                                  {analysisData.analysisOutput.ratings.momentum.score}/10
                                </span>
                              </div>
                              <p className='text-xs text-zinc-400'>
                                {analysisData.analysisOutput.ratings.momentum.explanation}
                              </p>
                            </div>
                          )}

                          {analysisData.analysisOutput.ratings.buyPressure && (
                            <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30'>
                              <div className='flex justify-between items-center mb-1'>
                                <span className='text-zinc-300'>Buy Pressure</span>
                                <span className='text-lg font-bold text-teal-400'>
                                  {analysisData.analysisOutput.ratings.buyPressure.score}/10
                                </span>
                              </div>
                              <p className='text-xs text-zinc-400'>
                                {analysisData.analysisOutput.ratings.buyPressure.explanation}
                              </p>
                            </div>
                          )}

                          {analysisData.analysisOutput.ratings.volumeQuality && (
                            <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30'>
                              <div className='flex justify-between items-center mb-1'>
                                <span className='text-zinc-300'>Volume Quality</span>
                                <span className='text-lg font-bold text-teal-400'>
                                  {analysisData.analysisOutput.ratings.volumeQuality.score}/10
                                </span>
                              </div>
                              <p className='text-xs text-zinc-400'>
                                {analysisData.analysisOutput.ratings.volumeQuality.explanation}
                              </p>
                            </div>
                          )}

                          {analysisData.analysisOutput.ratings.overallSentiment && (
                            <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30 sm:col-span-2'>
                              <div className='flex justify-between items-center mb-1'>
                                <span className='text-zinc-300'>Overall Sentiment</span>
                                <span className='text-lg font-bold text-teal-400'>
                                  {analysisData.analysisOutput.ratings.overallSentiment.score}/10
                                </span>
                              </div>
                              <p className='text-xs text-zinc-400'>
                                {analysisData.analysisOutput.ratings.overallSentiment.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {analysisData.analysisOutput.decodedStory && (
                      <div className='space-y-4'>
                        {analysisData.analysisOutput.decodedStory.marketcapJourney && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <LineChart className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Marketcap Journey</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.marketcapJourney}
                            </p>
                          </div>
                        )}

                        {analysisData.analysisOutput.decodedStory.momentum && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <TrendingUp className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Momentum</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.momentum}
                            </p>
                          </div>
                        )}

                        {analysisData.analysisOutput.decodedStory.keyLevels && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <Users className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Key Marketcap Levels</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.keyLevels}
                            </p>
                          </div>
                        )}

                        {analysisData.analysisOutput.decodedStory.tradingActivity && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <BarChart4 className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Trading Activity</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.tradingActivity}
                            </p>
                          </div>
                        )}

                        {analysisData.analysisOutput.decodedStory.buyerSellerDynamics && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <History className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Buyer vs Seller Dynamics</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.buyerSellerDynamics}
                            </p>
                          </div>
                        )}

                        {analysisData.analysisOutput.decodedStory.timeframeAnalysis && (
                          <div className='mb-3'>
                            <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                              <Calendar className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                              <span className='text-teal-400'>Timeframe Analysis</span>
                            </h4>
                            <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                              {analysisData.analysisOutput.decodedStory.timeframeAnalysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {analysisData.analysisOutput.marketSentiment && (
                      <div className='mb-3 mt-4'>
                        <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                          <Users className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                          <span className='text-teal-400'>Market Sentiment</span>
                        </h4>
                        <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                          {analysisData.analysisOutput.marketSentiment}
                        </p>
                      </div>
                    )}

                    {analysisData.analysisOutput.bottomLine && (
                      <div className='mt-4 pt-2 border-t border-zinc-800'>
                        <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                          <DollarSign className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                          <span className='text-teal-400'>Bottom Line</span>
                        </h4>
                        <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                          {analysisData.analysisOutput.bottomLine}
                        </p>
                      </div>
                    )}

                    {/* Add a disclaimer for the AI analysis results */}
                    <div className='mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-500'>
                      <Info
                        size={12}
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
                !tokenGatedApiError &&
                !error &&
                !showTryAgainError &&
                !showInsufficientCreditsError && (
                  <div className='mt-6 space-y-4'>
                    <div>
                      <label
                        htmlFor='date-range-slider'
                        className='block text-sm font-medium text-zinc-300 mb-2'>
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

                        return <RangeSlider key={sliderKey} {...sliderRenderProps} />;
                      })()}
                    </div>
                    <div className='text-xs text-zinc-500 p-3 bg-zinc-800/40 rounded-md border border-zinc-700/30 flex items-start'>
                      <Info size={16} className='mr-2 mt-0.5 shrink-0 text-teal-500' />
                      <span>
                        The AI will analyze chart data for the selected period. Analysis quality
                        depends on data availability. Insights are not financial advice.
                        {isAuthenticated && typeof userPlatformTokenBalance === 'undefined' ? (
                          <span className='block mt-1.5 text-zinc-400'>
                            Loading token balance...
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                )}

              <DialogFooter className='mt-6 sm:justify-between'>
                {!analysisData ? (
                  <DialogClose asChild>
                    <Button
                      variant='outline'
                      className='bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'>
                      Cancel
                    </Button>
                  </DialogClose>
                ) : null}

                {(() => {
                  if (showInsufficientCreditsError) {
                    return (
                      <Button asChild className='bg-teal-500 hover:bg-teal-600 text-white ml-auto'>
                        <Link href='/account/credits'>Get Credits</Link>
                      </Button>
                    );
                  }
                  if (showTryAgainError) {
                    return (
                      <Button
                        onClick={handleSubmitAnalysis}
                        disabled={isLoading}
                        className='bg-teal-500 hover:bg-teal-600 text-white ml-auto'>
                        {isLoading ? (
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                        ) : (
                          <History className='h-4 w-4 mr-2' />
                        )}
                        Try Again
                      </Button>
                    );
                  }
                  if (!analysisData && !tokenGatedApiError && !error) {
                    return (
                      <Button
                        onClick={handleSubmitAnalysis}
                        disabled={
                          isLoading ||
                          isCostLoading ||
                          !dateRange.from ||
                          !dateRange.to ||
                          (!isFreeTier && calculatedCreditCost === null) ||
                          (!isFreeTier && showInsufficientCreditsError)
                        }
                        className='bg-teal-500 hover:bg-teal-600 text-white ml-auto'>
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

                {analysisData && (
                  <DialogClose asChild>
                    <Button className='bg-teal-500 hover:bg-teal-600 text-white ml-auto'>
                      <Sparkles className='h-4 w-4 mr-2' />
                      Done
                    </Button>
                  </DialogClose>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TokenAiTradingAnalysis;
