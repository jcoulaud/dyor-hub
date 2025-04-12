'use client';

import { Pagination } from '@/components/ui/pagination';
import { users } from '@/lib/api';
import { formatDistanceStrict } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  CircleDot,
  Clock,
  MessageSquare,
  Reply,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { UserComment } from './page';

const CommentContent = ({ html }: { html: string }) => {
  return (
    <div
      className='text-zinc-300 text-sm line-clamp-2'
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const getActivityDetails = (comment: UserComment) => {
  if (comment.isUpvote) {
    return {
      type: 'Upvote',
      icon: <ThumbsUp className='h-3.5 w-3.5 text-green-400/80' />,
      color: 'text-green-400',
      borderColor: 'border-green-500/20 hover:border-green-500/30',
    };
  } else if (comment.isDownvote) {
    return {
      type: 'Downvote',
      icon: <ThumbsDown className='h-3.5 w-3.5 text-red-400/80' />,
      color: 'text-red-400',
      borderColor: 'border-red-500/20 hover:border-red-500/30',
    };
  } else if (comment.isReply) {
    return {
      type: 'Reply',
      icon: <Reply className='h-3.5 w-3.5 text-purple-400/80' />,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20 hover:border-purple-500/30',
    };
  } else {
    return {
      type: 'Comment',
      icon: <MessageSquare className='h-3.5 w-3.5 text-blue-400/80' />,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/20 hover:border-blue-500/30',
    };
  }
};

type SortFilter = 'recent' | 'popular';
type TypeFilter = 'all' | 'comments' | 'replies' | 'upvotes' | 'downvotes';

// Type filter tab component with count badge
function TypeFilterTab({
  active,
  onClick,
  icon,
  color,
  count,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: string;
  count?: number;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer
        ${
          active
            ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500'
            : `text-zinc-400 hover:text-zinc-300 ${color || ''}`
        }
        transition-all duration-200 text-xs font-semibold
      `}>
      {icon && <span className='flex'>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full text-xxs ${
            active ? 'bg-blue-500/30 text-blue-200' : 'bg-zinc-800 text-zinc-400'
          }`}>
          {count}
        </span>
      )}
    </button>
  );
}

export function Activity({
  initialComments,
  totalActivities,
  username,
}: {
  initialComments: UserComment[];
  totalActivities: number;
  username: string;
}) {
  const [sortFilter, setSortFilter] = useState<SortFilter>('recent');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleComments, setVisibleComments] = useState<UserComment[]>(initialComments || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: totalActivities || 0,
    page: 1,
    limit: 10,
    totalPages: Math.ceil((totalActivities || 0) / 10),
  });

  const [activityCounts, setActivityCounts] = useState({
    comments: 0,
    replies: 0,
    upvotes: 0,
    downvotes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await users.getUserStats(username);
        setActivityCounts(stats);
      } catch (error) {
        console.error('Failed to load user stats', error);
      }
    };

    fetchStats();
  }, [username]);

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await users.getUserActivity(username, currentPage, 10, typeFilter, sortFilter);

      setVisibleComments(result.data);
      setPagination(result.meta);
    } catch (error) {
      console.error('Failed to load user activity', error);
      setError('Failed to load activity. Please try again later.');
      setVisibleComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [username, currentPage, typeFilter, sortFilter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleSortFilterChange = (filter: SortFilter) => {
    if (isLoading) return;
    setSortFilter(filter);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (filter: TypeFilter) => {
    if (isLoading) return;
    setTypeFilter(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (isLoading || page === currentPage) return;
    setCurrentPage(page);
  };

  return (
    <div className='mb-12'>
      {/* Activity header  */}
      <div className='mb-6 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden'>
        <div className='p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold flex items-center gap-2 text-white/90'>
              <span className='w-6 h-6 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400'>
                <Clock className='h-3.5 w-3.5' />
              </span>
              Activity
            </h2>

            {/* Sort Filters */}
            <div className='flex items-center text-sm text-zinc-400 sm:hidden'>
              <button
                onClick={() => handleSortFilterChange('recent')}
                className={`px-3 py-1.5 rounded-l-md border cursor-pointer ${
                  sortFilter === 'recent'
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300'
                } transition-colors duration-200`}>
                Recent
              </button>
              <button
                onClick={() => handleSortFilterChange('popular')}
                className={`px-3 py-1.5 rounded-r-md border-t border-r border-b cursor-pointer ${
                  sortFilter === 'popular'
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300'
                } transition-colors duration-200`}>
                Popular
              </button>
            </div>
          </div>

          {/* Sort Filters - Desktop only */}
          <div className='hidden sm:flex items-center text-sm text-zinc-400'>
            <button
              onClick={() => handleSortFilterChange('recent')}
              className={`px-3 py-1.5 rounded-l-md border cursor-pointer ${
                sortFilter === 'recent'
                  ? 'bg-zinc-800 text-white border-zinc-700'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300'
              } transition-colors duration-200`}>
              Recent
            </button>
            <button
              onClick={() => handleSortFilterChange('popular')}
              className={`px-3 py-1.5 rounded-r-md border-t border-r border-b cursor-pointer ${
                sortFilter === 'popular'
                  ? 'bg-zinc-800 text-white border-zinc-700'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300'
              } transition-colors duration-200`}>
              Popular
            </button>
          </div>
        </div>

        {/* Type Filters  */}
        <div className='border-t border-zinc-800/50 bg-black/20 py-3 px-4 flex items-center overflow-x-auto'>
          <div className='flex items-center gap-3'>
            <TypeFilterTab
              active={typeFilter === 'all'}
              onClick={() => handleTypeFilterChange('all')}
              icon={<CircleDot className='h-3.5 w-3.5' />}
              color='text-blue-400'
              label='All'
              count={pagination.total}
            />
            <TypeFilterTab
              active={typeFilter === 'comments'}
              onClick={() => handleTypeFilterChange('comments')}
              icon={<MessageSquare className='h-3.5 w-3.5' />}
              color='text-blue-400'
              label='Comments'
              count={activityCounts.comments}
            />
            <TypeFilterTab
              active={typeFilter === 'replies'}
              onClick={() => handleTypeFilterChange('replies')}
              icon={<Reply className='h-3.5 w-3.5' />}
              color='text-purple-400'
              label='Replies'
              count={activityCounts.replies}
            />
            <TypeFilterTab
              active={typeFilter === 'upvotes'}
              onClick={() => handleTypeFilterChange('upvotes')}
              icon={<ArrowUp className='h-3.5 w-3.5' />}
              color='text-green-400'
              label='Upvotes'
              count={activityCounts.upvotes}
            />
            <TypeFilterTab
              active={typeFilter === 'downvotes'}
              onClick={() => handleTypeFilterChange('downvotes')}
              icon={<ArrowDown className='h-3.5 w-3.5' />}
              color='text-red-400'
              label='Downvotes'
              count={activityCounts.downvotes}
            />
          </div>
        </div>
      </div>

      {/* Activity grid */}
      <div className='space-y-4'>
        {isLoading ? (
          // Loading state
          <div className='py-12 text-center text-zinc-400'>
            <div className='w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p>Loading activities...</p>
          </div>
        ) : error ? (
          // Error state
          <div className='py-12 text-center'>
            <div className='bg-red-900/20 border border-red-900/30 rounded-lg p-6 mb-4 mx-auto max-w-md'>
              <p className='text-red-400 mb-2'>{error}</p>
              <button
                onClick={fetchActivity}
                className='px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/30 rounded text-red-100 text-sm transition-colors'>
                Try Again
              </button>
            </div>
          </div>
        ) : visibleComments.length === 0 ? (
          // Empty state
          <div className='py-12 text-center text-zinc-400'>
            <p className='mb-2'>No activities found.</p>
            {typeFilter !== 'all' && (
              <button
                onClick={() => handleTypeFilterChange('all')}
                className='px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/30 rounded text-zinc-300 text-sm transition-colors'>
                View All Activities
              </button>
            )}
          </div>
        ) : (
          // Activities list
          visibleComments.map((comment) => {
            const details = getActivityDetails(comment);
            return (
              <Link
                href={
                  comment.isRemoved
                    ? '#'
                    : `/tokens/${comment.tokenMintAddress}/comments/${comment.id}`
                }
                key={comment.id}
                className={`block p-4 bg-zinc-900/30 backdrop-blur-sm border ${details.borderColor} rounded-lg ${comment.isRemoved ? 'opacity-60 cursor-not-allowed' : 'hover:bg-zinc-900/50'} transition-all duration-200`}
                onClick={(e) => {
                  if (comment.isRemoved) e.preventDefault();
                }}
                aria-disabled={comment.isRemoved}
                tabIndex={comment.isRemoved ? -1 : undefined}>
                <div className='flex items-start gap-3'>
                  <div
                    className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-800/80 ${details.color}`}>
                    {details.icon}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className={`text-xs font-medium ${details.color}`}>{details.type}</span>
                      <span className='text-xs text-zinc-500'>•</span>
                      <span className='text-xs text-zinc-500'>
                        {formatDistanceStrict(new Date(comment.createdAt), new Date()) + ' ago'}
                      </span>
                      {comment.tokenSymbol && (
                        <>
                          <span className='text-xs text-zinc-500'>•</span>
                          <span className='text-xs text-zinc-400'>${comment.tokenSymbol}</span>
                        </>
                      )}
                    </div>

                    {/* Simply render the content from the backend */}
                    <CommentContent html={comment.content} />

                    {/* Keep the conditional rendering for votes */}
                    {!comment.isRemoved && ( // Hide votes if comment is removed
                      <div className='flex items-center gap-3 mt-1.5 text-xs'>
                        <div className='flex items-center gap-1 text-green-400/90'>
                          <ThumbsUp className='h-3 w-3' />
                          <span>{comment.upvotes || 0}</span>
                        </div>
                        <div className='flex items-center gap-1 text-red-400/90'>
                          <ThumbsDown className='h-3 w-3' />
                          <span>{comment.downvotes || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Use the Pagination component */}
      {!isLoading && !error && visibleComments.length > 0 && pagination.totalPages > 1 && (
        <div className='mt-8'>
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
