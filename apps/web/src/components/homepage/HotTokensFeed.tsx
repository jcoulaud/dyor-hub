import { TokenImage } from '@/components/tokens/TokenImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { HotTokenResult } from '@dyor-hub/types';
import { Flame, MessageSquare } from 'lucide-react';
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
        const data = await tokens.hot(8);
        setHotTokens(data || []);
      } catch (err) {
        console.error('Failed to load hot tokens:', err);
        setError('Failed to load tokens.');
        setHotTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const renderSkeleton = () => (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
      {[...Array(8)].map((_, i) => (
        <div key={i} className='flex flex-col items-center space-y-1 p-2'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-3 w-12' />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <p className='text-sm text-red-500 text-center py-4'>{error}</p>;
    }

    if (hotTokens.length === 0) {
      return <p className='text-sm text-zinc-500 text-center py-4'>No active tokens found.</p>;
    }

    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
        {hotTokens.map((token) => (
          <Link
            href={`/tokens/${token.mintAddress}`}
            key={token.mintAddress}
            className='flex flex-col items-center p-2 rounded-md hover:bg-zinc-800/50 transition-colors text-center group'>
            <TokenImage
              imageUrl={token.imageUrl}
              name={token.name}
              symbol={token.symbol}
              size='medium' // Adjust size as needed
            />
            <p className='text-sm font-medium text-zinc-200 mt-2 truncate w-full group-hover:text-orange-400 transition-colors'>
              {token.name}
            </p>
            <p className='text-xs text-zinc-400 flex items-center justify-center gap-1'>
              <MessageSquare className='h-3 w-3 text-zinc-500' />
              {token.commentCount} comments (24h)
            </p>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <CardTitle className='text-base font-medium flex items-center'>
          <Flame className='h-4 w-4 mr-2 text-orange-500' />
          Hot Tokens (Last 24h)
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow flex items-center justify-center'>
        {isLoading ? renderSkeleton() : renderContent()}
      </CardContent>
    </Card>
  );
};
