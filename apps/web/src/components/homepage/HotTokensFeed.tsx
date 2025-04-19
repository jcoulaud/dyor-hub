import { TokenImage } from '@/components/tokens/TokenImage';
import { SectionCarousel } from '@/components/ui/section-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { HotTokenResult } from '@dyor-hub/types';
import { Flame, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS_TO_FETCH = 25;
const DEFAULT_TIME_PERIOD = '7d';

type TokenItemProps = {
  token: HotTokenResult;
  index: number;
};

const TokenItem = memo(({ token, index }: TokenItemProps) => (
  <Link
    href={`/tokens/${token.mintAddress}`}
    className='flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 hover:border-amber-500/30 hover:bg-zinc-800/60 backdrop-blur-md transition-all duration-300 group'
    style={{ animationDelay: `${index * 100}ms` }}>
    <TokenImage
      imageUrl={token.imageUrl}
      name={token.name}
      symbol={token.symbol}
      size='small'
      className='border border-zinc-700/50 group-hover:border-amber-500/30 transition-all duration-300'
    />
    <div className='flex-1 min-w-0'>
      <p className='text-sm font-semibold text-white truncate group-hover:text-amber-300 transition-colors duration-200'>
        {token.name}
      </p>
      <div className='flex items-center gap-2'>
        <p className='text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200'>
          ${token.symbol}
        </p>
        {token.commentCount > 0 && (
          <div className='flex items-center text-xs text-amber-400 gap-1'>
            <TrendingUp className='h-3 w-3' />
            <span>{token.commentCount} comments</span>
          </div>
        )}
      </div>
    </div>

    {/* Animated arrow that appears on hover */}
    <div className='w-6 h-6 opacity-0 group-hover:opacity-100 transform translate-x-3 group-hover:translate-x-0 transition-all duration-300'>
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='text-amber-400'>
        <path d='M5 12h14'></path>
        <path d='m12 5 7 7-7 7'></path>
      </svg>
    </div>
  </Link>
));

TokenItem.displayName = 'TokenItem';

export const HotTokensFeed = memo(() => {
  const [allHotTokens, setAllHotTokens] = useState<HotTokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await tokens.hot(1, TOTAL_ITEMS_TO_FETCH, DEFAULT_TIME_PERIOD);
        setAllHotTokens(result.items || []); // Access items from the result
      } catch (err) {
        console.error('Failed to load hot tokens:', err);
        setError('Failed to load hot tokens');
        setAllHotTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const paginatedHotTokens = useMemo(() => {
    const pages: HotTokenResult[][] = [];
    if (allHotTokens.length > 0) {
      for (let i = 0; i < allHotTokens.length; i += ITEMS_PER_PAGE) {
        pages.push(allHotTokens.slice(i, i + ITEMS_PER_PAGE));
      }
    }
    return pages.length > 0 ? pages : [[]];
  }, [allHotTokens]);

  const renderSkeleton = () => (
    <div className='space-y-3 p-3'>
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <div
          key={index}
          className='p-3 flex items-center justify-between rounded-lg bg-zinc-800/30 backdrop-blur-md border border-zinc-700/20 animate-pulse'
          style={{ animationDelay: `${index * 100}ms` }}>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <div>
              <Skeleton className='h-4 w-28 mb-2' />
              <Skeleton className='h-3 w-20' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTokenList = (tokensToRender: HotTokenResult[]) => {
    if (!tokensToRender || tokensToRender.length === 0) {
      return (
        <div className='p-4 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No hot tokens found for this page.
        </div>
      );
    }
    return (
      <div className='flex flex-col gap-3 p-3'>
        {tokensToRender.map((token, index) => (
          <TokenItem key={token.mintAddress} token={token} index={index} />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (error) {
      return [
        <div
          key='error'
          className='px-4 py-4 text-sm text-red-500 bg-red-950/20 rounded-lg m-3 border border-red-900/50'>
          {error}
        </div>,
      ];
    }

    if (isLoading) {
      return [<div key='loading'>{renderSkeleton()}</div>];
    }

    if (allHotTokens.length === 0) {
      return [
        <div
          key='empty'
          className='px-4 py-4 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No hot tokens found
        </div>,
      ];
    }

    return paginatedHotTokens.map((pageTokens, pageIndex) => (
      <div key={`page-${pageIndex}`} className='h-full'>
        {renderTokenList(pageTokens)}
      </div>
    ));
  };

  return (
    <SectionCarousel
      title='Hot Tokens'
      icon={<Flame className='h-5 w-5 text-amber-400' />}
      gradient='from-zinc-900/95 via-zinc-800/90 to-amber-950/10'>
      {renderContent()}
    </SectionCarousel>
  );
});

HotTokensFeed.displayName = 'HotTokensFeed';
