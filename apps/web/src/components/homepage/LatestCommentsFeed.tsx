import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SectionCarousel } from '@/components/ui/section-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { comments } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { LatestComment } from '@dyor-hub/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS_TO_FETCH = 25;

export const LatestCommentsFeed: React.FC = () => {
  const [allComments, setAllComments] = useState<LatestComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await comments.listGlobal(1, TOTAL_ITEMS_TO_FETCH);
        setAllComments(result.data || []);
      } catch {
        setAllComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, []);

  const paginatedComments = useMemo(() => {
    const pages: LatestComment[][] = [];
    if (allComments.length > 0) {
      for (let i = 0; i < allComments.length; i += ITEMS_PER_PAGE) {
        pages.push(allComments.slice(i, i + ITEMS_PER_PAGE));
      }
    }
    return pages.length > 0 ? pages : [[]];
  }, [allComments]);

  const renderSkeleton = () => (
    <div className='space-y-2 p-2'>
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <div
          key={i}
          className='flex items-start space-x-3 p-2 bg-zinc-900/40 rounded-lg opacity-50'>
          <Skeleton className='h-7 w-7 rounded-full' />
          <div className='flex-1 space-y-1'>
            <Skeleton className='h-3.5 w-3/4' />
            <Skeleton className='h-2.5 w-full' />
            <Skeleton className='h-2.5 w-1/2' />
          </div>
        </div>
      ))}
    </div>
  );

  const renderCommentList = (commentsToRender: LatestComment[]) => {
    if (!commentsToRender || commentsToRender.length === 0) {
      return (
        <div className='p-2 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No comments found for this page.
        </div>
      );
    }

    return (
      <div className='p-2 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800/30'>
        {commentsToRender.map((comment) => {
          const userAvatarSrc = comment.user?.avatarUrl && getHighResAvatar(comment.user.avatarUrl);

          const textContent = comment.content.replace(/<[^>]*>?/gm, ' ').trim();
          const truncatedText =
            textContent.length > 80 ? `${textContent.substring(0, 80)}...` : textContent;

          return (
            <Link
              href={`/tokens/${comment.token.tokenMintAddress}/comments/${comment.id}`}
              key={comment.id}
              className='block p-3 rounded-lg bg-zinc-900/40 border border-blue-800/20 hover:border-blue-500/30 hover:bg-zinc-900/60 transition-all duration-200'>
              <div className='flex items-start space-x-3'>
                <Avatar className='h-7 w-7 border border-zinc-700'>
                  <AvatarImage src={userAvatarSrc} alt={comment.user?.displayName} />
                  <AvatarFallback className='text-xs bg-zinc-800'>
                    {comment.user?.displayName?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <p className='text-xs font-medium text-white truncate'>
                      {comment.user?.displayName || 'Unknown User'}
                    </p>
                    <p className='text-xs text-zinc-500 flex-shrink-0 ml-2'>
                      {formatDistanceToNowStrict(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <p className='text-xs text-zinc-400 mt-0.5'>
                    on <span className='font-medium text-zinc-300'>${comment.token.symbol}</span>
                  </p>

                  {/* Text content - truncated */}
                  <p className='text-xs text-zinc-300 mt-1 line-clamp-2'>{truncatedText}</p>

                  {/* Images/GIFs - if any */}
                  {comment.content.includes('<img') && (
                    <div className='mt-1'>
                      <div
                        className='prose prose-sm dark:prose-invert max-w-none prose-img:my-1 prose-img:max-h-8 prose-img:max-w-[60px] prose-img:inline-block prose-img:rounded-sm prose-img:border prose-img:border-zinc-700/50 prose-img:bg-zinc-800/50'
                        dangerouslySetInnerHTML={{
                          __html: comment.content.replace(/<(?!img)[^>]*>?/gm, ''),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
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

    if (allComments.length === 0) {
      return [
        <div
          key='empty'
          className='text-sm text-zinc-500 px-3 py-2 h-full flex items-center justify-center'>
          No comments yet.
        </div>,
      ];
    }

    return paginatedComments.map((pageComments, pageIndex) => (
      <div key={`page-${pageIndex}`} className='h-full'>
        {renderCommentList(pageComments)}
      </div>
    ));
  };

  return (
    <SectionCarousel
      title='Latest Comments'
      icon={<MessageSquare className='h-5 w-5 text-blue-400' />}
      gradient='from-zinc-900/90 via-zinc-800/80 to-zinc-900/90'
      className='h-auto min-h-[400px]'>
      {renderContent()}
    </SectionCarousel>
  );
};
