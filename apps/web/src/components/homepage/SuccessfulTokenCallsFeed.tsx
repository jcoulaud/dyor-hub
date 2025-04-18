import { TokenImage } from '@/components/tokens/TokenImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { calculateMultiplier } from '@/lib/utils';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronRight } from 'lucide-react';
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
        );
        setCalls(result.items || []);
      } catch (err) {
        console.error('Failed to load successful token calls:', err);
        setError('Failed to load calls');
        setCalls([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();
  }, []);

  const renderSkeleton = () => (
    <div>
      {[...Array(6)].map((_, index) => (
        <div key={index} className='px-4 py-2 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-6 w-6 rounded-full' />
            <div>
              <Skeleton className='h-4 w-32 mb-1' />
              <Skeleton className='h-3 w-24' />
            </div>
          </div>
          <div className='flex flex-col items-end'>
            <Skeleton className='h-3 w-16 mb-1' />
            <Skeleton className='h-3 w-20' />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className='bg-[#111] border-zinc-800/60 overflow-hidden'>
      <CardHeader className='py-3 px-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center'>
            <div className='h-2 w-2 rounded-full bg-emerald-500'></div>
          </div>
          <CardTitle className='text-base font-medium text-white'>
            Latest Successful Calls
          </CardTitle>
        </div>
        <Link
          href='/token-calls?tab=success'
          className='text-sm text-zinc-400 hover:text-white flex items-center gap-1'>
          View All <ChevronRight className='h-4 w-4' />
        </Link>
      </CardHeader>

      <CardContent className='p-0'>
        {isLoading ? (
          renderSkeleton()
        ) : error ? (
          <p className='px-4 py-2 text-sm text-red-500'>{error}</p>
        ) : calls.length === 0 ? (
          <p className='px-4 py-2 text-sm text-zinc-400'>No successful calls found</p>
        ) : (
          <div>
            {calls.map((call) => {
              const multiplier =
                call.peakPriceDuringPeriod && call.referencePrice
                  ? calculateMultiplier(call.referencePrice, call.peakPriceDuringPeriod)
                  : null;

              // Format time since target hit
              const timeAgo = call.targetHitTimestamp
                ? formatDistanceToNowStrict(new Date(call.targetHitTimestamp), { addSuffix: true })
                : call.targetDate
                  ? formatDistanceToNowStrict(new Date(call.targetDate), { addSuffix: true })
                  : 'Unknown';

              return (
                <Link
                  href={`/token-calls/${call.id}`}
                  key={call.id}
                  className='px-4 py-2 hover:bg-zinc-800/20 flex items-center justify-between group transition-colors'>
                  <div className='flex items-center gap-2'>
                    <TokenImage
                      imageUrl={call.token?.imageUrl}
                      name={call.token?.name || ''}
                      symbol={call.token?.symbol || ''}
                      size='small'
                    />

                    <div className='min-w-0'>
                      <p className='text-sm text-zinc-200 truncate'>
                        {call.user?.displayName || call.user?.username}
                      </p>
                      <div className='flex items-center gap-1'>
                        <p className='text-xs text-zinc-500'>${call.token?.symbol}</p>
                        <p className='text-xs text-cyan-400'>
                          {multiplier ? `${multiplier.toFixed(1)}x` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-col items-end'>
                    <p className='text-xs text-zinc-500'>{timeAgo}</p>
                    {multiplier && (
                      <p className='text-xs text-emerald-400'>
                        +{(multiplier * 100 - 100).toFixed(1)}% peak
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
