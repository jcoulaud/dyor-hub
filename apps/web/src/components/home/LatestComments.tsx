'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { comments } from '@/lib/api';
import { cn, getHighResAvatar } from '@/lib/utils';
import type { LatestComment } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface LatestCommentsProps {
  limit?: number;
  autoRotate?: boolean;
  rotationSpeed?: number;
}

export function LatestComments({
  limit = 5,
  autoRotate = true,
  rotationSpeed = 5000,
}: LatestCommentsProps) {
  const [commentsList, setComments] = useState<LatestComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const fetchLatestComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const latestComments = await comments.latest(limit);
      setComments(latestComments);
    } catch (error) {
      console.error('Error fetching latest comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLatestComments();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestComments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLatestComments]);

  const rotateToNext = useCallback(() => {
    if (commentsList.length <= 1) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % commentsList.length);
      setIsTransitioning(false);
    }, 300);
  }, [commentsList.length]);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || isLoading || commentsList.length <= 1 || isPaused) return;

    const intervalId = setInterval(rotateToNext, rotationSpeed);
    return () => clearInterval(intervalId);
  }, [autoRotate, rotateToNext, rotationSpeed, isLoading, commentsList.length, isPaused]);

  const handleNavigate = (index: number) => {
    if (index === currentIndex) return;

    setIsPaused(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
    setTimeout(() => setIsPaused(false), 2000);
  };

  if (isLoading) {
    return (
      <div className='relative h-[72px] w-full bg-black/10 rounded-lg'>
        <div className='flex items-center gap-4 p-4 h-full'>
          <Skeleton className='h-10 w-10 rounded-full flex-shrink-0' />
          <div className='flex-1'>
            <Skeleton className='h-3 w-28 mb-2' />
            <Skeleton className='h-3 w-full' />
          </div>
        </div>
      </div>
    );
  }

  if (commentsList.length === 0) {
    return <div className='text-sm text-zinc-500 italic'>No comments yet</div>;
  }

  const currentComment = commentsList[currentIndex];

  return (
    <div className='relative'>
      <div className='h-[72px] rounded-lg bg-black/10 hover:bg-black/15 transition-colors'>
        <div
          className={cn(
            'transition-opacity duration-300 h-full',
            isTransitioning ? 'opacity-0' : 'opacity-100',
          )}>
          <Link
            href={`/tokens/${currentComment.token.tokenMintAddress}/comments/${currentComment.id}`}
            className='flex items-center gap-4 h-full p-4 transition-colors'>
            <Avatar className='h-10 w-10 border border-white/10 flex-shrink-0'>
              <AvatarImage
                src={getHighResAvatar(currentComment.user.avatarUrl) || ''}
                alt={currentComment.user.displayName || 'User'}
              />
              <AvatarFallback className='text-xs'>
                {currentComment.user.displayName?.substring(0, 2) ||
                  (currentComment.user.username && currentComment.user.username.substring(0, 2)) ||
                  '??'}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center justify-between mb-1'>
                <div className='flex items-center gap-2 overflow-hidden'>
                  <span className='text-sm font-medium truncate max-w-[150px] text-blue-400'>
                    {currentComment.user.displayName || currentComment.user.username || 'Anonymous'}
                  </span>
                  <Badge
                    variant='outline'
                    className='text-xs px-2 py-0 h-5 border-zinc-700 bg-zinc-800/50 text-zinc-300'>
                    ${currentComment.token.symbol}
                  </Badge>
                </div>
                <span className='text-xs text-zinc-500 flex-shrink-0 ml-2 min-w-[70px] text-right'>
                  {formatDistanceToNow(new Date(currentComment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className='text-sm text-zinc-400 line-clamp-2'>{currentComment.content}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Navigation dots */}
      {commentsList.length > 1 && (
        <div className='flex justify-center gap-1 mt-2'>
          {commentsList.map((_, i) => (
            <button
              key={i}
              onClick={() => handleNavigate(i)}
              className='w-5 h-5 flex items-center justify-center cursor-pointer group'
              aria-label={`Go to comment ${i + 1}`}>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  'group-hover:scale-125 group-focus:scale-125',
                  i === currentIndex
                    ? 'bg-blue-400'
                    : 'bg-zinc-700 group-hover:bg-zinc-500 group-focus:bg-zinc-500',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
