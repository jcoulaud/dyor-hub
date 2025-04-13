'use client';

import { format } from 'date-fns';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Twitter,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

import { tokenCalls } from '@/lib/api';
import { calculateMultiplier, formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';

type StatusConfig = {
  icon: React.ReactNode;
  label: string;
  variant: 'success' | 'error' | 'warning';
};

const STATUS_CONFIG: Record<TokenCallStatus, StatusConfig> = {
  [TokenCallStatus.VERIFIED_SUCCESS]: {
    icon: <CheckCircle className='h-4 w-4' />,
    label: 'Success',
    variant: 'success',
  },
  [TokenCallStatus.VERIFIED_FAIL]: {
    icon: <XCircle className='h-4 w-4' />,
    label: 'Failed',
    variant: 'error',
  },
  [TokenCallStatus.PENDING]: {
    icon: <Clock className='h-4 w-4' />,
    label: 'Pending',
    variant: 'warning',
  },
  [TokenCallStatus.ERROR]: {
    icon: <XCircle className='h-4 w-4' />,
    label: 'Error',
    variant: 'error',
  },
};

export default function TokenCallDetailPage() {
  const params = useParams();
  const callId = params?.callId as string;
  const { user: currentUser, isAuthenticated } = useAuthContext();

  const [tokenCall, setTokenCall] = useState<TokenCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenCallData = async () => {
      if (!callId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await tokenCalls.getById(callId);
        setTokenCall(data);
      } catch (err) {
        console.error('Error fetching token call:', err);
        setError('Failed to load token call data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenCallData();
  }, [callId]);

  const callDetails = useMemo(() => {
    if (!tokenCall) return null;

    const { referencePrice, targetPrice, targetDate, createdAt } = tokenCall;
    const multiplier = calculateMultiplier(referencePrice, targetPrice);
    const isUp = multiplier !== null && multiplier > 1;

    return {
      multiplier,
      isUp,
      formattedMultiplier: multiplier ? `${multiplier.toFixed(2)}x` : 'N/A',
      targetDateFormatted: targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : 'N/A',
      createdAtFormatted: createdAt ? format(new Date(createdAt), 'MMM d, yyyy') : 'N/A',
    };
  }, [tokenCall]);

  const handleShare = () => {
    if (!tokenCall) return;

    const shareUrl = window.location.href;
    const tokenSymbol = tokenCall.token?.symbol ? `$${tokenCall.token.symbol}` : 'token';
    const predictedPrice = formatPrice(tokenCall.targetPrice);
    const multiplierText = callDetails?.multiplier
      ? `(${callDetails.isUp ? '▲' : '▼'}${callDetails.multiplier.toFixed(2)}x)`
      : '';

    // Check if this is the current user's prediction
    const isOwnPrediction = isAuthenticated && currentUser?.id === tokenCall.user?.id;

    // Check if target date is in the past
    const isTargetDatePassed = tokenCall.targetDate
      ? new Date(tokenCall.targetDate) < new Date()
      : false;

    const baseText = isOwnPrediction
      ? `I${isTargetDatePassed ? ' predicted' : "'m predicting"} a price of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub!`
      : `Check out ${tokenCall.user?.username ? `@${tokenCall.user.username}'s` : "this user's"} price prediction of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub!`;

    const text = `${baseText} What do you think? 🔥 ${shareUrl}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
  };

  if (isLoading) {
    return <TokenCallSkeleton />;
  }

  if (error || !tokenCall) {
    return <TokenCallError errorMessage={error || undefined} />;
  }

  const { user, token, status } = tokenCall;

  return (
    <TooltipProvider>
      <div className='container mx-auto px-4 py-6 max-w-5xl'>
        {/* Background elements */}
        <div className='fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 -z-10' />
        <div className='fixed inset-0 bg-[url("/grid-pattern.svg")] bg-repeat opacity-10 -z-10' />
        <div className='fixed inset-0 bg-gradient-radial from-amber-500/5 via-transparent to-transparent -z-10' />

        <h1 className='text-2xl sm:text-3xl font-bold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600'>
          Token Price Prediction
        </h1>

        {/* Main Card */}
        <div className='relative group transition-all duration-300'>
          <div className='absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300'></div>
          <Card className='relative bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
            <CardHeader className='flex flex-row justify-between items-center pb-2 border-b border-zinc-800/50'>
              <UserProfile user={user} />
              <div className='flex gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 gap-1.5 px-3 cursor-pointer hover:bg-zinc-800/70 transition-colors duration-200'
                  onClick={handleShare}>
                  <Twitter className='h-4 w-4' />
                  <span className='text-xs'>Share</span>
                </Button>
              </div>
            </CardHeader>

            {/* Subheader status badge and view all predictions button */}
            <div className='flex items-center justify-between px-5 py-3'>
              <StatusBadge status={status} />
              <Button
                variant='secondary'
                size='sm'
                className='h-8 px-3 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-100 text-xs font-medium border border-zinc-700/40 shadow-sm'
                asChild>
                <Link href={`/token-calls?username=${user?.username || ''}`}>
                  <span className='flex items-center gap-1.5'>
                    View all predictions
                    <ArrowUpRight className='h-3.5 w-3.5' />
                  </span>
                </Link>
              </Button>
            </div>

            <CardContent className='p-5 pt-0'>
              {/* Main content */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Left column: Token */}
                <div>
                  {/* Token card */}
                  <div className='bg-zinc-800/20 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/30 h-full flex flex-col justify-center'>
                    <Link href={`/tokens/${token?.mintAddress}`} className='block'>
                      <div className='flex flex-col items-center justify-center h-full'>
                        {/* Token image */}
                        <div className='relative mb-3 group flex justify-center items-center'>
                          <div className='absolute -inset-1 bg-gradient-to-r from-amber-500/40 to-amber-600/40 rounded-full blur-md opacity-70 group-hover:opacity-90 transition-opacity'></div>
                          <Avatar className='h-28 w-28 shadow-lg'>
                            <AvatarImage
                              src={token?.imageUrl || ''}
                              alt={token?.name || 'Token'}
                              className='object-cover'
                            />
                            <AvatarFallback className='bg-gradient-to-br from-amber-600/40 to-amber-700/40 text-amber-200 text-2xl'>
                              {token?.symbol.substring(0, 2).toUpperCase() || 'TK'}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Token name and symbol */}
                        <div className='text-center'>
                          <h3 className='text-xl font-semibold text-zinc-100 mb-1.5 hover:text-amber-400 transition-colors'>
                            {token?.name || 'Unknown Token'}
                          </h3>
                          <div className='inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20'>
                            <span className='text-amber-400 font-medium'>
                              ${token?.symbol || 'TOKEN'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right column: Prediction details */}
                <div className='bg-zinc-800/20 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/30'>
                  {/* Prices row */}
                  <div className='grid grid-cols-2 gap-3 mb-3'>
                    <div className='flex flex-col bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                      <span className='text-xs text-zinc-400 mb-1'>Reference Price</span>
                      <span className='font-medium text-zinc-100'>
                        ${formatPrice(tokenCall.referencePrice)}
                      </span>
                    </div>
                    <div className='flex flex-col bg-amber-500/10 rounded-lg border border-amber-500/30 p-3'>
                      <span className='text-xs text-zinc-400 mb-1'>Target Price</span>
                      <span className='font-medium text-amber-400'>
                        ${formatPrice(tokenCall.targetPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Multiplier */}
                  <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3 mb-3'>
                    <div className='flex justify-between items-center'>
                      <span className='text-zinc-400 text-sm'>Multiplier:</span>
                      <div
                        className={`font-medium px-3 py-1 rounded-md flex items-center gap-1.5 ${
                          callDetails?.isUp
                            ? 'text-green-500 bg-green-500/10'
                            : 'text-red-500 bg-red-500/10'
                        }`}>
                        {callDetails?.isUp ? (
                          <TrendingUp className='h-4 w-4' />
                        ) : (
                          <TrendingDown className='h-4 w-4' />
                        )}
                        {callDetails?.formattedMultiplier}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                      <div className='flex items-center gap-2'>
                        <Clock className='h-4 w-4 text-zinc-500' />
                        <span className='text-zinc-400 text-sm'>Call date:</span>
                      </div>
                      <span className='font-medium text-zinc-200'>
                        {callDetails?.createdAtFormatted}
                      </span>
                    </div>

                    <div className='flex justify-between items-center bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                      <div className='flex items-center gap-2'>
                        <CalendarClock className='h-4 w-4 text-zinc-500' />
                        <span className='text-zinc-400 text-sm'>Target date:</span>
                      </div>
                      <span className='font-medium text-zinc-200'>
                        {callDetails?.targetDateFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

function UserProfile({ user }: { user?: TokenCall['user'] }) {
  if (!user) return <div className='h-12'>Unknown User</div>;

  return (
    <Link
      href={`/users/${user.username || user.id}`}
      className='flex items-center group hover:opacity-90 transition-opacity'>
      <div className='relative'>
        <Avatar className='h-12 w-12 mr-4 border border-zinc-700/70 ring-1 ring-amber-500/10 shadow-lg'>
          <AvatarImage src={user.avatarUrl || ''} alt={user.displayName || 'User'} />
          <AvatarFallback className='bg-gradient-to-br from-amber-600/30 to-amber-700/30 text-amber-400'>
            {user.displayName?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      <div>
        <span className='font-medium text-lg text-zinc-100 hover:text-amber-400 transition-colors'>
          {user.displayName || 'Anonymous User'}
        </span>
        {user.username && (
          <p className='text-zinc-500 text-sm flex items-center'>
            <span className='text-zinc-400'>@{user.username}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

// Component for status badge
function StatusBadge({ status }: { status: TokenCallStatus }) {
  const config = STATUS_CONFIG[status];

  const variants = {
    success: 'bg-green-500/10 border-green-500/30 text-green-500',
    error: 'bg-red-500/10 border-red-500/30 text-red-500',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
  };

  return (
    <Badge
      variant='outline'
      className={`px-3 py-1.5 gap-1.5 ${variants[config.variant]} text-sm font-medium`}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

function TokenCallSkeleton() {
  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      <Skeleton className='h-9 w-48 mb-5 rounded-md' />

      <Card className='bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
        <CardContent className='p-0'>
          <div className='flex items-center justify-between p-5 pb-2 border-b border-zinc-800/50'>
            <div className='flex items-center'>
              <Skeleton className='h-12 w-12 rounded-full mr-4' />
              <div>
                <Skeleton className='h-6 w-40 mb-1 rounded-md' />
                <Skeleton className='h-4 w-24 rounded-md' />
              </div>
            </div>
            <Skeleton className='h-8 w-20 rounded-md' />
          </div>

          <div className='flex items-center justify-between px-5 py-3'>
            <Skeleton className='h-7 w-28 rounded-full' />
            <Skeleton className='h-8 w-36 rounded-md' />
          </div>

          <div className='p-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Skeleton className='h-64 rounded-lg' />
              <Skeleton className='h-64 rounded-lg' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TokenCallError({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      <Card className='bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
        <CardContent className='p-6'>
          <div className='text-center py-12'>
            <XCircle className='h-14 w-14 text-red-500/80 mx-auto mb-4' />
            <h2 className='text-xl font-medium text-zinc-200 mb-2'>
              {errorMessage || 'Token call not found'}
            </h2>
            <p className='text-zinc-500 mb-6 max-w-md mx-auto'>
              The token call you&apos;re looking for doesn&apos;t exist or could not be loaded.
            </p>
            <Button
              variant='default'
              className='bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border-0'
              asChild>
              <Link href='/token-calls'>View All Predictions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
