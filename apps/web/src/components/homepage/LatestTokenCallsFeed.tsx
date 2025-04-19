import { TokenImage } from '@/components/tokens/TokenImage';
import { SectionCarousel } from '@/components/ui/section-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { calculateMultiplier } from '@/lib/utils';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS_TO_FETCH = 25;

type TokenCallItemProps = {
  call: TokenCall;
};

const TokenCallItem = memo(({ call }: TokenCallItemProps) => {
  const multiplier =
    call.referencePrice && call.targetPrice
      ? calculateMultiplier(call.referencePrice, call.targetPrice)
      : null;
  const targetText = call.targetDate
    ? formatDistanceToNowStrict(new Date(call.targetDate), { addSuffix: true })
    : 'Unknown';

  return (
    <Link
      href={`/token-calls/${call.id}`}
      className='flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-blue-800/20 hover:border-blue-500/30 hover:bg-zinc-800/60 transition-all duration-200 group'>
      <TokenImage
        imageUrl={call.token?.imageUrl}
        name={call.token?.name || ''}
        symbol={call.token?.symbol || ''}
        size='small'
        className='h-9 w-9'
      />
      <div className='flex-1 min-w-0 py-0.5'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-medium text-white truncate'>${call.token?.symbol}</p>
          {multiplier && (
            <span className='text-sm font-semibold text-blue-400'>{multiplier.toFixed(1)}x</span>
          )}
        </div>
        <div className='flex items-center justify-between mt-1'>
          <p className='text-xs text-zinc-400 truncate'>
            By {call.user?.displayName || call.user?.username}
          </p>
          <span className='text-xs text-zinc-500'>{targetText}</span>
        </div>
      </div>
    </Link>
  );
});

TokenCallItem.displayName = 'TokenCallItem';

export const LatestTokenCallsFeed = memo(() => {
  const [allCalls, setAllCalls] = useState<TokenCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await tokenCalls.list(
          {
            status: [TokenCallStatus.PENDING, TokenCallStatus.VERIFIED_SUCCESS],
          },
          { page: 1, limit: TOTAL_ITEMS_TO_FETCH },
        );
        setAllCalls(result.items || []);
      } catch {
        setError('Failed to load calls');
        setAllCalls([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCalls();
  }, []);

  const paginatedCalls = useMemo(() => {
    const pages: TokenCall[][] = [];
    if (allCalls.length > 0) {
      for (let i = 0; i < allCalls.length; i += ITEMS_PER_PAGE) {
        pages.push(allCalls.slice(i, i + ITEMS_PER_PAGE));
      }
    }
    return pages.length > 0 ? pages : [[]];
  }, [allCalls]);

  const renderSkeleton = () => (
    <div className='space-y-2 p-2'>
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <div
          key={index}
          className='p-2 flex items-center justify-between bg-zinc-900/40 rounded-lg opacity-50'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <div>
              <Skeleton className='h-3.5 w-24 mb-1' />
              <Skeleton className='h-2.5 w-16' />
            </div>
          </div>
          <Skeleton className='h-3.5 w-10' />
        </div>
      ))}
    </div>
  );

  const renderCallsList = (calls: TokenCall[]) => {
    if (!calls || calls.length === 0) {
      return (
        <div className='p-2 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No calls found for this page.
        </div>
      );
    }
    return (
      <div className='flex flex-col gap-2 p-2'>
        {calls.map((call) => (
          <TokenCallItem key={call.id} call={call} />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (error) {
      return [
        <div key='error' className='px-3 py-2 text-sm text-red-500'>
          {error}
        </div>,
      ];
    }

    if (isLoading) {
      return [<div key='loading'>{renderSkeleton()}</div>];
    }

    if (allCalls.length === 0) {
      return [
        <div
          key='empty'
          className='px-3 py-2 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No token calls found.
        </div>,
      ];
    }

    return paginatedCalls.map((pageData, pageIndex) => (
      <div key={`page-${pageIndex}`} className='h-full'>
        {renderCallsList(pageData)}
      </div>
    ));
  };

  return (
    <SectionCarousel
      title='Latest Token Calls'
      icon={<DollarSign className='h-5 w-5 text-purple-400' />}
      viewAllLink='/token-calls'
      gradient='from-zinc-900/90 via-zinc-800/80 to-zinc-900/90'>
      {renderContent()}
    </SectionCarousel>
  );
});

LatestTokenCallsFeed.displayName = 'LatestTokenCallsFeed';
