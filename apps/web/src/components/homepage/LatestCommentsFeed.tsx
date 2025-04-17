import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { comments } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { LatestComment } from '@dyor-hub/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

const COMMENTS_PER_PAGE = 10;

export const LatestCommentsFeed: React.FC = () => {
  const [latestComments, setLatestComments] = useState<LatestComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchComments = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await comments.listGlobal(page, COMMENTS_PER_PAGE);
      setLatestComments(result.data || []);
      setTotalPages(Math.min(result.meta.totalPages || 1, 4));
    } catch {
      setError('Failed to load comments.');
      setLatestComments([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(currentPage);
  }, [fetchComments, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const renderSkeleton = () => (
    <div className='space-y-3 px-3 pb-3'>
      {[...Array(COMMENTS_PER_PAGE)].map((_, i) => (
        <div key={i} className='flex items-start space-x-3 py-1.5'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='flex-1 space-y-1'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-full' />
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

    if (isLoading && latestComments.length === 0) {
      return renderSkeleton();
    }

    if (latestComments.length === 0 && !isLoading) {
      return <p className='text-sm text-zinc-500 px-4 pb-4'>No comments yet.</p>;
    }

    return (
      <div className='space-y-2'>
        {latestComments.map((comment) => {
          const userAvatarSrc = comment.user?.avatarUrl && getHighResAvatar(comment.user.avatarUrl);

          const displayContent =
            comment.content.length > 80
              ? `${comment.content.substring(0, 80)}...`
              : comment.content;

          return (
            <Link
              href={`/tokens/${comment.token.tokenMintAddress}/comments/${comment.id}`}
              key={comment.id}
              className='block p-3 rounded-md hover:bg-zinc-800/50 transition-colors'>
              <div className='flex items-start space-x-3'>
                <Avatar className='h-8 w-8 border border-zinc-700 mt-1'>
                  <AvatarImage src={userAvatarSrc} alt={comment.user?.displayName} />
                  <AvatarFallback className='text-xs bg-zinc-800'>
                    {comment.user?.displayName?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-medium text-zinc-200 truncate'>
                      {comment.user?.displayName || 'Unknown User'}
                    </p>
                    <p className='text-xs text-zinc-500 flex-shrink-0 ml-2'>
                      {formatDistanceToNowStrict(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <p className='text-xs text-zinc-400 mt-1'>
                    Commented on{' '}
                    <span className='font-medium text-zinc-300'>${comment.token.symbol}</span>
                  </p>
                  <p
                    className='text-sm text-zinc-300 mt-1.5 line-clamp-2'
                    dangerouslySetInnerHTML={{ __html: displayContent }}
                  />
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
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-medium flex items-center'>
          <MessageSquare className='h-4 w-4 mr-2 text-blue-400' />
          Latest Comments
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow overflow-auto pt-0 min-h-0'>
        {isLoading ? renderSkeleton() : renderContent()}
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
