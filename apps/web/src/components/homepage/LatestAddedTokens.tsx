import { TokenImage } from '@/components/tokens/TokenImage';
import { SectionCarousel } from '@/components/ui/section-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { Token } from '@dyor-hub/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS_TO_FETCH = 25;

export const LatestAddedTokens = () => {
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await tokens.list(1, TOTAL_ITEMS_TO_FETCH, 'createdAt');
        setAllTokens(result.data || []);
      } catch {
        setError('Failed to load tokens');
        setAllTokens([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTokens();
  }, []);

  const paginatedTokens = useMemo(() => {
    const pages: Token[][] = [];
    if (allTokens.length > 0) {
      for (let i = 0; i < allTokens.length; i += ITEMS_PER_PAGE) {
        pages.push(allTokens.slice(i, i + ITEMS_PER_PAGE));
      }
    }
    return pages.length > 0 ? pages : [[]];
  }, [allTokens]);

  const renderSkeleton = () => (
    <div className='p-2 space-y-2'>
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <div key={i} className='p-2 flex items-center gap-2 bg-zinc-900/40 rounded-lg opacity-50'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='flex-1'>
            <Skeleton className='h-4 w-28 mb-1' />
            <Skeleton className='h-3 w-16' />
          </div>
        </div>
      ))}
    </div>
  );

  const renderTokenList = (tokensToRender: Token[]) => {
    if (!tokensToRender || tokensToRender.length === 0) {
      return (
        <div className='p-2 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No tokens found for this page.
        </div>
      );
    }
    return (
      <div className='p-2 space-y-2'>
        {tokensToRender.map((token) => (
          <Link
            key={token.mintAddress}
            href={`/tokens/${token.mintAddress}`}
            className='flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-green-800/20 hover:border-green-500/30 hover:bg-zinc-800/60 transition-all duration-200 group'>
            <TokenImage
              imageUrl={token.imageUrl}
              name={token.name}
              symbol={token.symbol}
              size='small'
              className='h-9 w-9 border border-zinc-700/50'
            />
            <div className='flex-1 min-w-0 py-0.5'>
              <p className='text-sm font-medium text-white truncate'>{token.name}</p>
              <p className='text-xs text-zinc-400 truncate'>${token.symbol}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (error) {
      return [
        <div key='error' className='text-sm text-red-500 px-3 py-2'>
          {error}
        </div>,
      ];
    }

    if (isLoading) {
      return [<div key='loading'>{renderSkeleton()}</div>];
    }

    if (allTokens.length === 0) {
      return [
        <div
          key='empty'
          className='text-sm text-zinc-500 px-3 py-2 h-full flex items-center justify-center'>
          No tokens found
        </div>,
      ];
    }

    return paginatedTokens.map((pageTokens, pageIndex) => (
      <div key={`page-${pageIndex}`} className='h-full'>
        {renderTokenList(pageTokens)}
      </div>
    ));
  };

  return (
    <SectionCarousel
      title='Latest Added Tokens'
      icon={<Plus className='h-5 w-5 text-green-500' />}
      gradient='from-zinc-900/90 via-zinc-800/80 to-zinc-900/90'>
      {renderContent()}
    </SectionCarousel>
  );
};
