import { TokenImage } from '@/components/tokens/TokenImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { HotTokenResult } from '@dyor-hub/types';
import { ChevronRight, Flame, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export const HotTokensFeed: React.FC = () => {
  const [hotTokens, setHotTokens] = useState<HotTokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await tokens.hot(5);
        setHotTokens(data || []);
      } catch (err) {
        console.error('Failed to load hot tokens:', err);
        setError('Failed to load tokens');
        setHotTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const renderSkeleton = () => (
    <div>
      {[...Array(4)].map((_, index) => (
        <div key={index} className='px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <div>
              <Skeleton className='h-4 w-32 mb-1.5' />
              <Skeleton className='h-3 w-24' />
            </div>
          </div>
          <Skeleton className='h-4 w-16' />
        </div>
      ))}
    </div>
  );

  return (
    <Card className='backdrop-blur-sm bg-zinc-900/40 border-zinc-800/60 overflow-hidden h-full rounded-xl'>
      <CardHeader className='py-4 px-5'>
        <div className='flex items-center gap-3'>
          <div className='h-7 w-7 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center'>
            <Flame className='h-4 w-4 text-amber-500' />
          </div>
          <CardTitle className='text-base font-semibold text-white'>Hot Tokens</CardTitle>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {isLoading ? (
          renderSkeleton()
        ) : error ? (
          <p className='px-5 py-3 text-sm text-red-500'>{error}</p>
        ) : hotTokens.length === 0 ? (
          <p className='px-5 py-3 text-sm text-zinc-400'>No hot tokens found</p>
        ) : (
          <div className='space-y-1'>
            {hotTokens.map((token) => (
              <Link
                href={`/tokens/${token.mintAddress}`}
                key={token.mintAddress}
                className='px-5 py-3 hover:bg-white/5 flex items-center justify-between group transition-colors rounded-lg mx-1'>
                <div className='flex items-center gap-3'>
                  <TokenImage
                    imageUrl={token.imageUrl}
                    name={token.name}
                    symbol={token.symbol}
                    size='small'
                    className='border border-zinc-700/50'
                  />

                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-white truncate'>{token.name}</p>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs text-zinc-500'>${token.symbol}</p>
                      <div className='flex items-center text-xs text-amber-500/90 gap-0.5'>
                        <TrendingUp className='h-3 w-3' />
                        <span>{token.commentCount} comments</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-center'>
                  <div className='h-6 w-6 rounded-full bg-zinc-800/80 flex items-center justify-center group-hover:bg-zinc-700/80 transition-colors'>
                    <ChevronRight className='h-3.5 w-3.5 text-zinc-400 group-hover:text-white transition-colors' />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
