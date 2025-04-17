import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { calculateMultiplier, cn, getHighResAvatar } from '@/lib/utils';
import { TokenCall, TokenCallSortBy, TokenCallStatus } from '@dyor-hub/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export const SuccessfulTokenCallsFeed: React.FC = () => {
  const [calls, setCalls] = useState<TokenCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await tokenCalls.list(
          {
            status: [TokenCallStatus.VERIFIED_SUCCESS],
          },
          { page: 1, limit: 10 },
          {
            sortBy: TokenCallSortBy.TARGET_DATE,
            sortOrder: 'DESC',
          },
        );
        setCalls(result.items || []);
      } catch (err) {
        console.error('Failed to load successful token calls:', err);
        setError('Failed to load calls.');
        setCalls([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();
  }, []);

  const renderSkeleton = () => (
    <div className='space-y-3 px-3 pb-3'>
      {[...Array(10)].map((_, i) => (
        <div key={i} className='flex items-center space-x-3 py-1.5'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='flex-1 space-y-1'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <p className='text-sm text-red-500 px-4 pb-4'>{error}</p>;
    }

    if (calls.length === 0) {
      return <p className='text-sm text-zinc-500 px-4 pb-4'>No successful calls yet.</p>;
    }

    return (
      <div className='space-y-1'>
        {calls.map((call) => {
          const userAvatarSrc = call.user?.avatarUrl && getHighResAvatar(call.user.avatarUrl);
          const multiplier = calculateMultiplier(call.referencePrice, call.peakPriceDuringPeriod);
          const finalMultiplier = calculateMultiplier(call.referencePrice, call.targetPrice);

          return (
            <Link
              href={`/token-calls/${call.id}`}
              key={call.id}
              className='block p-3 rounded-md hover:bg-zinc-800/50 transition-colors group'>
              <div className='flex items-center space-x-3'>
                <Avatar className='h-8 w-8 border border-green-600'>
                  <AvatarImage src={userAvatarSrc} alt={call.user?.displayName} />
                  <AvatarFallback className='text-xs bg-zinc-800'>
                    {call.user?.displayName?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-zinc-200 truncate'>
                    {call.user?.displayName || 'Unknown User'}
                  </p>
                  <p className='text-xs text-zinc-400'>
                    <span className='font-medium text-zinc-300'>
                      ${call.token?.symbol || 'Token'}
                    </span>{' '}
                    hit{' '}
                    <span className={cn('font-semibold text-green-400')}>
                      {finalMultiplier ? `${finalMultiplier.toFixed(1)}x` : 'Target'}
                    </span>
                  </p>
                </div>
                <div className='text-right flex-shrink-0'>
                  <p className='text-xs text-zinc-500'>
                    {call.targetHitTimestamp
                      ? formatDistanceToNowStrict(new Date(call.targetHitTimestamp), {
                          addSuffix: true,
                        })
                      : formatDistanceToNowStrict(new Date(call.targetDate), {
                          addSuffix: true,
                        })}
                  </p>
                  <div className='flex justify-end items-center text-green-500 group-hover:text-green-400 transition-colors'>
                    <TrendingUp className='h-4 w-4' />
                    {multiplier && (
                      <span className='ml-1 text-xs font-semibold'>
                        {`+${multiplier.toFixed(1)}x peak`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-base font-medium flex items-center'>
          <CheckCircle className='h-4 w-4 mr-2 text-green-500' />
          Latest Successful Calls
        </CardTitle>
        <Button variant='ghost' size='sm' className='h-7 px-2 py-1' asChild>
          <Link href='/token-calls?tab=success&status=VERIFIED_SUCCESS'>
            View All
            <ChevronRight className='h-4 w-4 ml-1' />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className='flex-grow overflow-hidden pt-0'>
        {isLoading ? renderSkeleton() : renderContent()}
      </CardContent>
    </Card>
  );
};
