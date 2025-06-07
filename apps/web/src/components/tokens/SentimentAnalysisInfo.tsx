'use client';

import { TokenGatedMessage } from '@/components/common/TokenGatedMessage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ApiError, tokens as apiTokens, SentimentAnalysisProgressEvent } from '@/lib/api';
import { DYORHUB_SYMBOL, MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS } from '@/lib/constants';
import { cn, formatTokenAmount } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { SentimentAnalysisResponse, TokenGatedErrorData } from '@dyor-hub/types';
import { AlertTriangle, Brain, ChevronRight, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import io, { type Socket } from 'socket.io-client';

interface SentimentAnalysisInfoProps {
  mintAddress: string;
  className?: string;
  userPlatformTokenBalance?: number;
  tokenData?: { twitterHandle?: string | null } | null;
}

const SentimentAnalysisDisplay = ({
  sentimentData,
  isLoading,
  realProgress,
  realStage,
}: {
  sentimentData: SentimentAnalysisResponse | null;
  isLoading?: boolean;
  realProgress?: number;
  realStage?: string;
}) => {
  if (isLoading || (!sentimentData && isLoading !== false)) {
    const displayProgress = realProgress || 5;
    const displayStage = realStage || 'Preparing analysis...';

    return (
      <div className='flex flex-col items-center justify-center py-12 space-y-6'>
        <Loader2 className='h-16 w-16 animate-spin text-blue-400' />
        <div className='text-center space-y-3'>
          <h3 className='text-lg font-semibold text-zinc-100'>AI Twitter Analysis</h3>
          <p className='text-zinc-300 max-w-md'>{displayStage}</p>
          <div className='w-full max-w-md mx-auto space-y-2'>
            <div className='w-full bg-zinc-700 rounded-full h-2'>
              <div
                className='bg-blue-400 h-2 rounded-full transition-all duration-500 ease-out'
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <p className='text-xs text-zinc-400 text-center'>{displayProgress}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sentimentData) {
    return (
      <>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-zinc-100 flex items-center'>
            <Brain className='w-5 h-5 mr-2 text-blue-400' />
            Sentiment Analysis
          </DialogTitle>
        </DialogHeader>
        <div className='p-6 flex flex-col items-center justify-center text-center'>
          <Brain className='w-12 h-12 text-blue-400 mb-4' />
          <h3 className='text-lg font-semibold text-zinc-100 mb-2'>No Data Available</h3>
          <p className='text-sm text-zinc-400'>
            AI Twitter analysis data is not available for this token.
          </p>
        </div>
      </>
    );
  }

  const { profile, insights } = sentimentData;

  return (
    <>
      <DialogHeader className='pb-2'>
        <DialogTitle className='text-zinc-100 flex items-center'>
          <Brain className='w-5 h-5 mr-2 text-blue-400' />
          AI Twitter Analysis - @{profile.username}
        </DialogTitle>
      </DialogHeader>
      <div
        className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600'
        style={{ maxHeight: '65vh' }}>
        <div className='px-1 pb-3 space-y-4'>
          {/* Clean Score Display */}
          <div className='p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-lg font-bold text-zinc-100'>AI Assessment Score</h4>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${(() => {
                  const score = Math.round(((profile.overallSentiment.overall + 1) / 2) * 100);
                  if (score >= 80)
                    return 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30';
                  if (score >= 70)
                    return 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30';
                  if (score >= 60)
                    return 'bg-amber-400/20 text-amber-300 border border-amber-400/30';
                  if (score >= 40)
                    return 'bg-orange-400/20 text-orange-300 border border-orange-400/30';
                  if (score >= 25) return 'bg-red-400/20 text-red-300 border border-red-400/30';
                  return 'bg-red-500/20 text-red-400 border border-red-500/30';
                })()}`}>
                {(() => {
                  const score = Math.round(((profile.overallSentiment.overall + 1) / 2) * 100);
                  if (score >= 80) return 'Highly Legitimate';
                  if (score >= 60) return 'Legitimate';
                  if (score >= 40) return 'Questionable';
                  if (score >= 25) return 'High Risk';
                  return 'Very High Risk';
                })()}
              </div>
            </div>

            <div className='flex items-center gap-12'>
              {/* Grade */}
              <div className='text-center'>
                <div
                  className={`text-4xl font-bold ${(() => {
                    const score = Math.round(((profile.overallSentiment.overall + 1) / 2) * 100);
                    if (score >= 70) return 'text-emerald-400';
                    if (score >= 40) return 'text-amber-400';
                    return 'text-red-400';
                  })()}`}>
                  {(() => {
                    const score = Math.round(((profile.overallSentiment.overall + 1) / 2) * 100);
                    if (score >= 90) return 'A+';
                    if (score >= 80) return 'A';
                    if (score >= 70) return 'B';
                    if (score >= 60) return 'C';
                    if (score >= 40) return 'D';
                    return 'F';
                  })()}
                </div>
                <div className='text-xs text-zinc-500 font-medium'>Grade</div>
              </div>

              {/* Score */}
              <div className='text-center'>
                <div
                  className={`text-4xl font-bold ${(() => {
                    const score = Math.round(((profile.overallSentiment.overall + 1) / 2) * 100);
                    if (score >= 70) return 'text-emerald-400';
                    if (score >= 40) return 'text-amber-400';
                    return 'text-red-400';
                  })()}`}>
                  {Math.round(((profile.overallSentiment.overall + 1) / 2) * 100)}
                  <span className='text-lg text-zinc-500'>/100</span>
                </div>
                <div className='text-xs text-zinc-500 font-medium'>Score</div>
              </div>
            </div>
          </div>

          {/* Communication Style */}
          <div className='p-4 bg-zinc-800/50 rounded-md border border-zinc-700/50'>
            <h4 className='text-sm font-semibold text-zinc-200 mb-3'>Communication Style</h4>
            <div className='grid grid-cols-3 gap-4 text-sm'>
              <div>
                <div className='text-zinc-500'>Tone</div>
                <div className='font-medium text-zinc-200 capitalize'>
                  {profile.communicationStyle.tone}
                </div>
              </div>
              <div>
                <div className='text-zinc-500'>Authenticity</div>
                <div
                  className={`font-medium capitalize ${
                    profile.communicationStyle.authenticity === 'high'
                      ? 'text-emerald-400'
                      : profile.communicationStyle.authenticity === 'medium'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                  {profile.communicationStyle.authenticity}
                </div>
              </div>
              <div>
                <div className='text-zinc-500'>Responsiveness</div>
                <div className='font-medium text-zinc-200 capitalize'>
                  {profile.communicationStyle.responsiveness}
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Analysis */}
          <div className='p-4 bg-zinc-800/50 rounded-md border border-zinc-700/50'>
            <h4 className='text-sm font-semibold text-zinc-200 mb-3'>Strategic Analysis</h4>
            <div className='space-y-3'>
              {insights.keyFindings.slice(0, 4).map((finding, index) => (
                <div key={index} className='flex items-start gap-3 text-sm'>
                  <div className='w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0' />
                  <span className='text-zinc-300 leading-relaxed'>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Assessment */}
          <div className='p-4 bg-zinc-800/50 rounded-md border border-zinc-700/50'>
            <h4 className='text-sm font-semibold text-zinc-200 mb-3'>Investment Assessment</h4>
            <div className='space-y-4'>
              {/* Only show Red Flags section if there are actual risk factors */}
              {insights.riskFactors && insights.riskFactors.length > 0 && (
                <div>
                  <h5 className='text-xs font-medium text-red-400 mb-2 flex items-center gap-1'>
                    <span className='w-2 h-2 bg-red-400 rounded-full'></span>
                    Red Flags
                  </h5>
                  <ul className='space-y-1.5'>
                    {insights.riskFactors.map((risk, index) => (
                      <li key={index} className='text-sm text-zinc-300 flex items-start gap-2 pl-1'>
                        <span className='text-red-400 mt-0.5 font-bold'>▸</span>
                        <span className='leading-relaxed'>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h5 className='text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1'>
                  <span className='w-2 h-2 bg-emerald-400 rounded-full'></span>
                  Legitimacy Signals
                </h5>
                <ul className='space-y-1.5'>
                  {insights.sentimentDrivers.positive.map((positive, index) => (
                    <li key={index} className='text-sm text-zinc-300 flex items-start gap-2 pl-1'>
                      <span className='text-emerald-400 mt-0.5 font-bold'>▸</span>
                      <span className='leading-relaxed'>{positive}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const InsufficientCreditsContent = ({
  onClose,
  requiredCredits,
}: {
  onClose: () => void;
  requiredCredits: number;
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
        You need {requiredCredits} credit{requiredCredits !== 1 ? 's' : ''} to perform this
        analysis, but you don&apos;t have enough. Purchase more credits to continue.
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

export const SentimentAnalysisInfo = ({
  mintAddress,
  className,
  userPlatformTokenBalance,
  tokenData,
}: SentimentAnalysisInfoProps) => {
  const { isAuthenticated, user, checkAuth } = useAuthContext();
  const [sentimentData, setSentimentData] = useState<SentimentAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorData, setErrorData] = useState<TokenGatedErrorData | null>(null);
  const { toast } = useToast();

  const [realProgress, setRealProgress] = useState(5);
  const [realStage, setRealStage] = useState('Preparing analysis...');

  const socketRef = useRef<Socket | null>(null);
  const currentAnalysisSessionId = useRef<string | null>(null);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const errorHandledForSession = useRef<Record<string, boolean>>({});

  // WebSocket setup
  useEffect(() => {
    let isMounted = true;

    // Only connect when dialog is open and user is authenticated
    if (!isDialogOpen || !isAuthenticated || !user?.id) {
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
    const socketUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/analysis`;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('sentiment_analysis_progress', (data: SentimentAnalysisProgressEvent) => {
      if (!isMounted) return;

      if (
        !currentAnalysisSessionId.current ||
        (data.sessionId && data.sessionId !== currentAnalysisSessionId.current)
      ) {
        return;
      }

      // Update real progress from WebSocket
      if (data.progress && isMounted) {
        setRealProgress(data.progress);
      }
      if (data.message && isMounted) {
        setRealStage(data.message);
      }

      if (data.status === 'error' && data.sessionId) {
        if (errorHandledForSession.current[data.sessionId]) {
          return;
        }

        errorHandledForSession.current[data.sessionId] = true;

        if (isMounted) setIsLoading(false);

        // Check for insufficient credits error
        if (
          data.message?.toLowerCase().includes('insufficient credits') ||
          data.error?.toLowerCase().includes('insufficient credits')
        ) {
          if (isMounted) {
            setError('Insufficient credits for AI Twitter Analysis');
            setErrorData({
              message: 'Insufficient credits for AI Twitter Analysis.',
              requiredCredits: 3,
              isTokenGated: true,
            });
          }
          return;
        }

        if (isMounted) {
          setError(data.message || 'Analysis failed');
          toast({
            title: 'Analysis Failed',
            description: data.message || data.error || 'Could not complete sentiment analysis.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (
        data.status === 'complete' &&
        data.sentimentData &&
        !hasShownCompletionToast &&
        isMounted
      ) {
        setHasShownCompletionToast(true);
        setSentimentData(data.sentimentData);
        setIsLoading(false);
        toast({
          title: 'Analysis Complete',
          description: 'Twitter sentiment analysis is ready.',
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
  }, [isDialogOpen, isAuthenticated, user?.id, toast, hasShownCompletionToast]);

  // Don't render if there's no Twitter handle
  if (!tokenData?.twitterHandle) {
    return null;
  }

  const isTokenHolder =
    isAuthenticated &&
    userPlatformTokenBalance !== undefined &&
    userPlatformTokenBalance >= MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS;

  const handleOpenDialog = async () => {
    if (!isAuthenticated) {
      await checkAuth(true);
      if (!isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view AI Twitter Analysis.',
          variant: 'destructive',
        });
        return;
      }
    }
    setSentimentData(null);
    setError(null);
    setErrorData(null);
    setIsLoading(false);
    setIsDialogOpen(true);
  };

  const handleConfirmAnalysis = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    // Clear all previous errors and states for a new submission attempt
    setIsLoading(true);
    setError(null);
    setErrorData(null);
    setHasShownCompletionToast(false);
    setRealProgress(5);
    setRealStage('Starting analysis...');
    errorHandledForSession.current = {};

    // Generate new session ID for this analysis
    const newSessionId = Math.random().toString(36).substring(2, 15);
    currentAnalysisSessionId.current = newSessionId;

    try {
      const useCredits = !isTokenHolder;

      await apiTokens.startSentimentAnalysis(mintAddress, useCredits, newSessionId);
    } catch (err) {
      const caughtError = err as ApiError;

      setIsLoading(false);

      if (
        caughtError.status === 403 &&
        (caughtError.message?.toLowerCase().includes('insufficient credits') ||
          (typeof caughtError.data === 'object' &&
            caughtError.data &&
            'details' in caughtError.data &&
            typeof caughtError.data.details === 'object' &&
            caughtError.data.details &&
            'code' in caughtError.data.details &&
            caughtError.data.details.code === 'INSUFFICIENT_CREDITS'))
      ) {
        setErrorData({
          message: 'Insufficient credits for AI Twitter Analysis.',
          requiredCredits: 3,
          isTokenGated: true,
        });
      } else {
        setError(
          caughtError.message ||
            'An error occurred while performing the sentiment analysis. Please try again.',
        );
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: caughtError.message || 'Could not start sentiment analysis.',
        });
      }
    } finally {
      if (!socketRef.current?.connected) {
        setIsLoading(false);
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSentimentData(null);
    setError(null);
    setErrorData(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleDialogClose();
    }
    setIsDialogOpen(open);
  };

  if (!isAuthenticated && error && errorData?.message?.includes('Please log in')) {
    return (
      <div className={cn('rounded-lg border border-zinc-700/80 p-4 bg-zinc-900/50', className)}>
        <TokenGatedMessage
          error={
            new ApiError(401, errorData?.message || 'Please log in to view AI Twitter Analysis.')
          }
          featureName='AI Twitter Analysis'
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        onClick={handleOpenDialog}
        variant='outline'
        size='lg'
        className={cn(
          'w-full h-14 bg-zinc-900/70 border-zinc-700/60 hover:border-blue-400 hover:bg-zinc-800/70 text-zinc-100 flex items-center justify-between rounded-lg transition-all duration-200 shadow-md hover:shadow-lg',
          className,
        )}
        disabled={isLoading}>
        {isLoading ? (
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center mr-3'>
              <Loader2 className='w-5 h-5 text-blue-100 animate-spin' />
            </div>
            <span className='font-semibold'>Analyzing...</span>
          </div>
        ) : (
          <>
            <div className='flex items-center'>
              <div className='w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center mr-3'>
                <Brain className='w-5 h-5 text-blue-100' />
              </div>
              <span className='font-semibold'>AI Twitter Analysis</span>
            </div>
            <ChevronRight className='w-5 h-5 text-blue-400' />
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className='max-w-4xl bg-zinc-900/95 border-zinc-700/50 backdrop-blur-md text-zinc-50 data-[state=open]:animate-contentShow'>
          {errorData?.requiredCredits ? (
            <InsufficientCreditsContent
              onClose={handleDialogClose}
              requiredCredits={errorData.requiredCredits}
            />
          ) : sentimentData ? (
            <SentimentAnalysisDisplay sentimentData={sentimentData} isLoading={isLoading} />
          ) : (
            <>
              <DialogHeader className='pb-2'>
                <DialogTitle className='text-zinc-100 flex items-center'>
                  <Brain className='w-5 h-5 mr-2 text-blue-400' />
                  AI Twitter Analysis
                </DialogTitle>
                {!isLoading && (
                  <>
                    <DialogDescription className='text-sm text-zinc-400 pt-1'>
                      AI-powered analysis of Twitter account authenticity, communication patterns,
                      and community engagement quality.
                    </DialogDescription>
                    {isLoading ? (
                      <div className='block mt-2 text-zinc-400 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin inline mr-1.5' />
                        Loading user data...
                      </div>
                    ) : !isAuthenticated ? (
                      <div className='text-center text-sm text-zinc-400 mt-2'>
                        {`Log in and hold ${formatTokenAmount(MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS, DYORHUB_SYMBOL)} for free analysis.`}
                      </div>
                    ) : isTokenHolder ? (
                      <div className='text-emerald-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`This analysis is FREE for you! (You hold ${formatTokenAmount(userPlatformTokenBalance)}/${formatTokenAmount(MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS)} required ${DYORHUB_SYMBOL})`}
                      </div>
                    ) : isAuthenticated && typeof userPlatformTokenBalance === 'undefined' ? (
                      <div className='block mt-2 text-zinc-400 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin inline mr-1.5' />
                        Loading token balance...
                      </div>
                    ) : (
                      <div className='text-amber-400 flex items-center gap-1 mt-2 text-sm'>
                        <Info size={16} className='inline shrink-0 mr-1' />
                        {`Hold ${formatTokenAmount(MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS, DYORHUB_SYMBOL)} for free analysis. Your balance: ${formatTokenAmount(userPlatformTokenBalance, DYORHUB_SYMBOL)}.`}
                      </div>
                    )}
                  </>
                )}
              </DialogHeader>

              {error && !errorData && (
                <div className='my-4 p-4 bg-red-900/20 border border-red-700/50 rounded-md text-red-400 flex items-center'>
                  <AlertTriangle className='h-5 w-5 mr-2' />
                  {error}
                </div>
              )}

              {isLoading && !sentimentData && (
                <SentimentAnalysisDisplay
                  sentimentData={null}
                  isLoading={true}
                  realProgress={realProgress}
                  realStage={realStage}
                />
              )}

              {!isLoading && !sentimentData && (
                <DialogFooter className='mt-6'>
                  <Button
                    onClick={handleConfirmAnalysis}
                    disabled={isLoading || !isAuthenticated}
                    className='bg-blue-600 hover:bg-blue-700 text-white ml-auto'>
                    {isLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                      <Brain className='h-4 w-4 mr-2' />
                    )}
                    {isLoading
                      ? 'Analyzing...'
                      : isTokenHolder
                        ? 'Analyze (Free)'
                        : 'Analyze (3 Credits)'}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
