import { TokenImage } from '@/components/tokens/TokenImage'; // Reuse TokenImage
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { Token } from '@dyor-hub/types';
import { Coins } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

const TOKENS_PER_PAGE = 8;
const MAX_PAGES = 5;

export const LatestAddedTokens: React.FC = () => {
  const [latestTokens, setLatestTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTokens = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await tokens.list(page, TOKENS_PER_PAGE, 'createdAt');
      setLatestTokens(result.data || []);
      setTotalPages(Math.min(result.meta.totalPages || 1, MAX_PAGES));
    } catch {
      setError('Failed to load tokens.');
      setLatestTokens([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens(currentPage);
  }, [fetchTokens, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const renderSkeleton = () => (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
      {[...Array(TOKENS_PER_PAGE)].map((_, i) => (
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

    if (isLoading && latestTokens.length === 0) {
      return renderSkeleton();
    }

    if (latestTokens.length === 0 && !isLoading) {
      return <p className='text-sm text-zinc-500 text-center py-4'>No tokens found.</p>;
    }

    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
        {latestTokens.map((token) => (
          <Link
            href={`/tokens/${token.mintAddress}`}
            key={token.mintAddress}
            className='flex flex-col items-center p-2 rounded-md hover:bg-zinc-800/50 transition-colors text-center group'>
            <TokenImage
              imageUrl={token.imageUrl}
              name={token.name}
              symbol={token.symbol}
              size='medium'
            />
            <p className='text-sm font-medium text-zinc-200 mt-2 truncate w-full group-hover:text-blue-400 transition-colors'>
              {token.name}
            </p>
            <p className='text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors'>
              ${token.symbol}
            </p>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-medium flex items-center'>
          <Coins className='h-4 w-4 mr-2 text-yellow-400' />
          Latest Added Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow flex items-center justify-center min-h-0 pt-0'>
        {isLoading && currentPage === 1 ? renderSkeleton() : renderContent()}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className='pt-4 border-t border-zinc-800/50'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardFooter>
      )}
    </Card>
  );
};
