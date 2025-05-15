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
import { format, max as maxDateUtil, min as minDateUtil, startOfDay } from 'date-fns';
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
  Lock,
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
        You don&apos;t have enough credits to perform this AI Trading Analysis. Purchase more
        credits to continue.
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
  const [error, setError] = useState<string | null>(null);
  const [tokenGatedApiError, setTokenGatedApiError] = useState<ApiError | null>(null);
  const [platformTokenGateFailed, setPlatformTokenGateFailed] = useState(false);
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

  const resetState = useCallback(() => {
    setError(null);
    setTokenGatedApiError(null);
    setPlatformTokenGateFailed(false);
    setAnalysisData(null);
    setCalculatedCreditCost(null);
    setShowInsufficientCreditsError(false);
    setShowTryAgainError(false);
    setTryAgainErrorMessage(null);
    setDateRange({ from: actualMinDate, to: actualMaxDate });
    setAnalysisProgress(null);
    setHasShownCompletionToast(false);
    setIsLoading(false);
    errorHandledForSession.current = {};

    // Disconnect any active socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear current session ID
    currentAnalysisSessionId.current = null;
  }, [actualMinDate, actualMaxDate]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      resetState();

      // Reset socket and session for new credit check when reopened
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      currentAnalysisSessionId.current = null;
    }
  }, [isModalOpen, resetState]);

  useEffect(() => {
    setDateRange({ from: actualMinDate, to: actualMaxDate });
  }, [actualMinDate, actualMaxDate]);

  // WebSocket setup
  useEffect(() => {
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
      // Verify session matches if we have an active session
      if (
        currentAnalysisSessionId.current &&
        data.sessionId &&
        data.sessionId !== currentAnalysisSessionId.current
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
        setIsLoading(false);

        // Check for insufficient credits error
        if (
          data.message?.toLowerCase().includes('insufficient credits') ||
          data.error?.toLowerCase().includes('insufficient credits')
        ) {
          setShowInsufficientCreditsError(true);
          setShowTryAgainError(false);
          setTryAgainErrorMessage(null);
          setAnalysisProgress(null);
          return;
        }

        // Handle other errors
        setTryAgainErrorMessage(data.message || 'Analysis failed');
        setShowTryAgainError(true);
        setShowInsufficientCreditsError(false);

        toast({
          title: 'Analysis Failed',
          description: data.message || data.error || 'Could not complete AI analysis.',
          variant: 'destructive',
        });
        return;
      }

      setAnalysisProgress(data);

      // Handle completion
      if (data.status === 'complete' && data.analysisData && !hasShownCompletionToast) {
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
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isModalOpen, isAuthenticated, user?.id, toast, hasShownCompletionToast]);

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

    // Reset any previous credit-related errors when opening modal
    setShowInsufficientCreditsError(false);

    setIsModalOpen(true);

    if (isAuthenticated) {
      if (
        typeof userPlatformTokenBalance === 'number' &&
        userPlatformTokenBalance < MIN_TOKEN_HOLDING_FOR_AI_TA
      ) {
        setPlatformTokenGateFailed(true);
        return;
      }

      // Always reset credit cost and fetch fresh data when opening modal
      setCalculatedCreditCost(null);
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

    // Clear all previous errors and states
    setIsLoading(true);
    setError(null);
    setTokenGatedApiError(null);
    setAnalysisData(null);
    setAnalysisProgress(null);
    setHasShownCompletionToast(false);
    setShowTryAgainError(false);
    setTryAgainErrorMessage(null);
    setShowInsufficientCreditsError(false);
    errorHandledForSession.current = {};

    // Force a fresh credit check to ensure we have the latest credit status
    try {
      await apiTokens.getAiTradingAnalysisCost(mintAddress);
      // If we get here, we should have credits
    } catch (creditErr) {
      const creditError = creditErr as ApiError;
      // Check specifically for insufficient credits error
      if (
        creditError.status === 403 &&
        (creditError.message?.toLowerCase().includes('insufficient credits') ||
          (creditError.data &&
            typeof creditError.data === 'object' &&
            'details' in creditError.data &&
            creditError.data.details &&
            typeof creditError.data.details === 'object' &&
            'code' in creditError.data.details &&
            creditError.data.details.code === 'INSUFFICIENT_CREDITS'))
      ) {
        setShowInsufficientCreditsError(true);
        setIsLoading(false);
        return;
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
        setShowInsufficientCreditsError(true);
        setError(null);
        toast({
          title: 'Insufficient Credits',
          description: 'Not enough credits for this analysis.',
          variant: 'destructive',
        });
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
        toast({
          title: 'Analysis Failed',
          description:
            errorData?.message || caughtError.message || 'Could not retrieve AI trading analysis.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!socketRef.current?.connected) {
        setIsLoading(false);
      }
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
      <h3 className='text-sm font-medium text-zinc-400 flex items-center gap-2 mb-2'>
        <Sparkles className='w-4 h-4 text-teal-400' />
        AI Technical Analysis
      </h3>
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
        <DialogContent className='max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-50'>
          {showInsufficientCreditsError ? (
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
                  !platformTokenGateFailed &&
                  !tokenGatedApiError &&
                  !error &&
                  !showTryAgainError && (
                    <DialogDescription className='text-sm text-zinc-400 pt-1'>
                      Select the date range for the analysis. The AI will analyze price action,
                      momentum, and key support/resistance zones.
                    </DialogDescription>
                  )}
                {/* Show description for the results state */}
                {analysisData && analysisData.analysisOutput && !showTryAgainError && (
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

              {analysisData && analysisData.analysisOutput && (
                <div className='mt-4 space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600'>
                  <h3 className='text-base font-semibold text-zinc-100'>AI Analysis Results:</h3>

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
                        {analysisData.analysisOutput.ratings.priceStrength && (
                          <div className='bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30'>
                            <div className='flex justify-between items-center mb-1'>
                              <span className='text-zinc-300'>Price Strength</span>
                              <span className='text-lg font-bold text-teal-400'>
                                {analysisData.analysisOutput.ratings.priceStrength.score}/10
                              </span>
                            </div>
                            <p className='text-xs text-zinc-400'>
                              {analysisData.analysisOutput.ratings.priceStrength.explanation}
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
                      {analysisData.analysisOutput.decodedStory.priceJourney && (
                        <div className='mb-3'>
                          <h4 className='text-sm font-medium text-zinc-200 mb-1.5 flex items-center'>
                            <LineChart className='w-3.5 h-3.5 mr-1.5 text-teal-400' />
                            <span className='text-teal-400'>Price Journey</span>
                          </h4>
                          <p className='text-sm text-zinc-300 whitespace-pre-wrap pl-5'>
                            {analysisData.analysisOutput.decodedStory.priceJourney}
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
                            <span className='text-teal-400'>Key Price Levels</span>
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
                !platformTokenGateFailed &&
                !tokenGatedApiError &&
                !error &&
                !showTryAgainError && (
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
