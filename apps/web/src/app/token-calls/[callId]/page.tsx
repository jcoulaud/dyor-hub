'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { calculateMultiplier, formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { format } from 'date-fns';
import { CheckCircle, Clock, Twitter, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const getStatusDetails = (status: TokenCallStatus) => {
  switch (status) {
    case TokenCallStatus.VERIFIED_SUCCESS:
      return {
        icon: <CheckCircle className='h-6 w-6 text-green-500' />,
        label: 'Success',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
      };
    case TokenCallStatus.VERIFIED_FAIL:
      return {
        icon: <XCircle className='h-6 w-6 text-red-500' />,
        label: 'Failed',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
      };
    case TokenCallStatus.PENDING:
    default:
      return {
        icon: <Clock className='h-6 w-6 text-amber-500' />,
        label: 'Pending',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
      };
  }
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

  // Handle loading state
  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8 max-w-4xl'>
        <Card className='bg-zinc-900/40 backdrop-blur-sm border-zinc-800'>
          <CardContent className='p-6'>
            <div className='flex flex-col gap-4'>
              <Skeleton className='h-8 w-64' />
              <Skeleton className='h-6 w-48' />
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mt-4'>
                <div className='flex flex-col gap-4'>
                  <Skeleton className='h-32 rounded-lg' />
                </div>
                <div className='flex flex-col gap-4'>
                  <Skeleton className='h-32 rounded-lg' />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (error || !tokenCall) {
    return (
      <div className='container mx-auto px-4 py-8 max-w-4xl'>
        <Card className='bg-zinc-900/40 backdrop-blur-sm border-zinc-800'>
          <CardContent className='p-6'>
            <div className='text-center py-12'>
              <h2 className='text-xl font-medium text-zinc-300 mb-2'>
                {error || 'Token call not found'}
              </h2>
              <p className='text-zinc-500 mb-6'>
                The token call you&apos;re looking for doesn&apos;t exist or could not be loaded.
              </p>
              <Button asChild>
                <Link href='/token-calls'>View All Predictions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate values from token call data
  const { user, token, status, referencePrice, targetPrice, targetDate, createdAt } = tokenCall;
  const multiplier = calculateMultiplier(referencePrice, targetPrice);
  const isUp = multiplier !== null && multiplier > 1;
  const statusDetails = getStatusDetails(status);
  const formattedMultiplier = multiplier ? `${multiplier.toFixed(2)}x` : 'N/A';
  const targetDateFormatted = targetDate ? format(new Date(targetDate), 'MMM d, yyyy') : 'N/A';

  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Page Background */}
      <div className='fixed inset-0 bg-gradient-to-br from-zinc-950/50 to-zinc-900/50 z-0' />
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />

      <h1 className='text-2xl sm:text-3xl font-bold mb-6 text-gradient-amber'>
        Token Price Prediction
      </h1>

      {/* Main Card */}
      <div className='relative'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl blur opacity-15'></div>
        <Card className='relative bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
          <CardContent className='p-6'>
            {/* User Info */}
            <div className='flex items-center justify-between mb-8'>
              <div className='flex items-center'>
                <Avatar className='h-12 w-12 mr-4 border border-zinc-700'>
                  <AvatarImage src={user?.avatarUrl || ''} alt={user?.displayName || 'User'} />
                  <AvatarFallback className='bg-amber-600/20 text-amber-500'>
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/profile/${user?.username || user?.id}`}
                    className='font-medium text-lg text-zinc-100 hover:text-amber-400 transition-colors'>
                    {user?.displayName || 'Anonymous User'}
                  </Link>
                  {user?.username && <p className='text-zinc-500 text-sm'>@{user.username}</p>}
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 gap-1 px-2 cursor-pointer group'
                  onClick={(e) => {
                    e.preventDefault();
                    const shareUrl = window.location.href;
                    const tokenSymbol = token?.symbol ? `$${token.symbol}` : 'token';
                    const predictedPrice = formatPrice(targetPrice);
                    const multiplierText = multiplier
                      ? `(${isUp ? '▲' : '▼'}${multiplier.toFixed(2)}x)`
                      : '';

                    // Check if this is the current user's prediction
                    const isOwnPrediction = isAuthenticated && currentUser?.id === user?.id;

                    // Check if target date is in the past
                    const isTargetDatePassed = targetDate
                      ? new Date(targetDate) < new Date()
                      : false;

                    let text = '';

                    if (isOwnPrediction) {
                      // User sharing their own prediction
                      if (isTargetDatePassed) {
                        // Past prediction
                        text = `I predicted a price of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥`;
                      } else {
                        // Future prediction
                        text = `I'm predicting a price of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥`;
                      }
                    } else {
                      // User sharing someone else's prediction
                      const username = user?.username
                        ? `@${user.username}`
                        : user?.displayName || "this user's";

                      if (isTargetDatePassed) {
                        // Past prediction
                        text = `Check out @${username}'s price prediction of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥`;
                      } else {
                        // Future prediction
                        text = `Check out @${username}'s price prediction of $${predictedPrice} ${multiplierText} for ${tokenSymbol} on #DYORhub! What do you think? 🔥`;
                      }
                    }

                    // Add URL directly in the text
                    text += ` ${shareUrl}`;

                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
                  }}>
                  <Twitter className='h-4 w-4 text-zinc-400 group-hover:text-white' />
                  <span className='text-xs text-zinc-400 group-hover:text-white'>Share</span>
                </Button>
              </div>
            </div>

            {/* Status Badge and Action Button */}
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center'>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${statusDetails.bgColor} ${statusDetails.borderColor} border ${statusDetails.color}`}>
                  {statusDetails.icon}
                  <span className='ml-2'>{statusDetails.label}</span>
                </div>
              </div>
              <Button
                variant='default'
                size='sm'
                className='h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs'
                asChild>
                <Link href={`/token-calls?username=${user?.username || ''}`}>
                  View all {user?.displayName || 'user'}&apos;s predictions
                </Link>
              </Button>
            </div>

            {/* Token Call Details */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              {/* Token Info */}
              <div className='bg-zinc-800/30 rounded-xl p-6 border border-zinc-700/30'>
                <h3 className='text-lg font-medium text-zinc-300 mb-4'>Token</h3>
                {token ? (
                  <Link href={`/tokens/${token.mintAddress}`} className='flex items-center group'>
                    <Avatar className='h-16 w-16 mr-4 border border-zinc-700'>
                      <AvatarImage src={token.imageUrl || ''} alt={token.name} />
                      <AvatarFallback className='bg-zinc-800 text-zinc-300'>
                        {token.symbol.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className='font-medium text-lg text-zinc-100 group-hover:text-amber-400 transition-colors block'>
                        {token.name}
                      </span>
                      <span className='text-zinc-500'>${token.symbol}</span>
                    </div>
                  </Link>
                ) : (
                  <p className='text-zinc-500'>Unknown Token</p>
                )}
              </div>

              {/* Prediction Details */}
              <div className='bg-zinc-800/30 rounded-xl p-6 border border-zinc-700/30'>
                <h3 className='text-lg font-medium text-zinc-300 mb-4'>Prediction</h3>
                <div className='space-y-4'>
                  <div className='flex justify-between'>
                    <span className='text-zinc-400'>Reference Price:</span>
                    <span className='font-medium text-zinc-200'>
                      ${formatPrice(referencePrice)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-zinc-400'>Target Price:</span>
                    <span className='font-medium text-zinc-200'>${formatPrice(targetPrice)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-zinc-400'>Multiplier:</span>
                    <span className={`font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                      {isUp ? '▲' : '▼'} {formattedMultiplier}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-zinc-400'>Call date:</span>
                    <span className='font-medium text-zinc-200'>
                      {createdAt ? format(new Date(createdAt), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-zinc-400'>Target date:</span>
                    <span className='font-medium text-zinc-200'>{targetDateFormatted}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
