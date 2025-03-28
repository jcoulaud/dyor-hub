'use client';

import { users } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
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
  const [visibleComments, setVisibleComments] = useState<UserComment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: totalActivities,
    page: 1,
    limit: 10,
    totalPages: Math.ceil(totalActivities / 10),
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
    try {
      const result = await users.getUserActivity(username, currentPage, 10, typeFilter, sortFilter);

      setVisibleComments(result.data);
      setPagination(result.meta);
    } catch (error) {
      console.error('Failed to load user activity', error);
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
              count={totalActivities}
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
              icon={<ThumbsUp className='h-3.5 w-3.5' />}
              color='text-green-400'
              label='Upvotes'
              count={activityCounts.upvotes}
            />
            <TypeFilterTab
              active={typeFilter === 'downvotes'}
              onClick={() => handleTypeFilterChange('downvotes')}
              icon={<ThumbsDown className='h-3.5 w-3.5' />}
              color='text-red-400'
              label='Downvotes'
              count={activityCounts.downvotes}
            />
          </div>
        </div>
      </div>

      {/* No results message */}
      {!isLoading && visibleComments.length === 0 && (
        <div className='py-12 text-center bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/30 rounded-xl'>
          <p className='text-zinc-500 text-sm'>
            No {typeFilter !== 'all' ? typeFilter : 'activities'} found.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className='py-12 text-center bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/30 rounded-xl'>
          <div className='inline-block animate-pulse flex space-x-2 justify-center items-center'>
            <div className='h-2 w-2 bg-blue-400 rounded-full'></div>
            <div className='h-2 w-2 bg-blue-400 rounded-full delay-75'></div>
            <div className='h-2 w-2 bg-blue-400 rounded-full delay-150'></div>
            <span className='text-zinc-500 text-sm ml-2'>Loading activities...</span>
          </div>
        </div>
      )}

      {/* Cards Grid Layout */}
      {!isLoading && visibleComments.length > 0 && (
        <div className='space-y-3'>
          {visibleComments.map((comment) => {
            const activityDetails = getActivityDetails(comment);

            return (
              <div key={comment.id} className='relative group'>
                <div
                  className={`
                    group bg-zinc-900/30 hover:bg-zinc-900/50 backdrop-blur-sm border 
                    ${activityDetails.borderColor}
                    rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md
                  `}>
                  <Link
                    href={`/tokens/${comment.tokenMintAddress}?comment=${comment.id}`}
                    className='block cursor-pointer'>
                    {/* Comment Header */}
                    <div className='p-2.5 border-b border-zinc-800/50 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='flex items-center justify-center h-4 w-4'>
                          {activityDetails.icon}
                        </span>
                        <span
                          className={`
                          text-sm font-medium 
                          ${activityDetails.color}
                        `}>
                          {activityDetails.type} on ${comment.tokenSymbol}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-xs text-zinc-500'>
                        <Clock className='h-3 w-3' />
                        <span>
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Comment Content */}
                    <div className='px-4 py-2.5'>
                      {comment.isRemoved ? (
                        <div className='text-zinc-500 text-sm italic'>
                          This comment has been removed
                        </div>
                      ) : (
                        <CommentContent html={comment.content} />
                      )}
                    </div>

                    {/* Comment Footer */}
                    <div className='px-4 py-2 bg-black/20 flex items-center justify-between'>
                      <div className='flex items-center gap-4'>
                        <div className='flex items-center gap-1.5'>
                          <ArrowUp className='h-3.5 w-3.5 text-green-400/80' />
                          <span className='text-xs text-zinc-400'>{comment.upvotes}</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <ArrowDown className='h-3.5 w-3.5 text-red-400/80' />
                          <span className='text-xs text-zinc-400'>{comment.downvotes}</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* View button */}
                  <div className='absolute bottom-2 right-4 z-10'>
                    <Link
                      href={`/tokens/${comment.tokenMintAddress}?comment=${comment.id}`}
                      className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors text-xs text-zinc-400 hover:text-white'
                      onClick={(e) => e.stopPropagation()}>
                      <span>View</span>
                      <ChevronRight className='h-3 w-3' />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination  */}
      {!isLoading && visibleComments.length > 0 && pagination.totalPages > 1 && (
        <div className='mt-6 flex items-center justify-between'>
          <div className='text-xs text-zinc-500'>
            Showing {visibleComments.length} of {pagination.total} activities
          </div>

          <div className='flex text-xs'>
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={isLoading || currentPage === 1}
              className={`
                flex items-center justify-center
                px-2 py-1.5 rounded-l-md border cursor-pointer
                ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300
                transition-colors duration-200
              `}>
              <ChevronLeft className='h-3 w-3' />
            </button>

            {(() => {
              const SIBLINGS = 1; // Siblings on each side
              const BOUNDARIES = 1; // Boundary pages (first/last) to show

              const range = (start: number, end: number) => {
                const length = end - start + 1;
                return Array.from({ length }, (_, i) => start + i);
              };

              const totalPageCount = pagination.totalPages;
              const totalPageNumbers = SIBLINGS * 2 + 3; // siblings + current + first + last

              // Case 1: Not enough pages to need ellipsis
              if (totalPageCount <= totalPageNumbers) {
                return range(1, totalPageCount).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    disabled={isLoading}
                    className={`
                      min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                      ${
                        currentPage === page
                          ? 'bg-blue-600 text-white font-medium border-blue-700'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      transition-colors duration-200
                    `}>
                    {page}
                  </button>
                ));
              }

              // Calculate left and right siblings
              const leftSiblingIndex = Math.max(currentPage - SIBLINGS, BOUNDARIES);
              const rightSiblingIndex = Math.min(
                currentPage + SIBLINGS,
                totalPageCount - BOUNDARIES,
              );

              const shouldShowLeftDots = leftSiblingIndex > BOUNDARIES + 1;
              const shouldShowRightDots = rightSiblingIndex < totalPageCount - BOUNDARIES;

              // Case 2: Show left dots but no right dots
              if (!shouldShowLeftDots && shouldShowRightDots) {
                const leftItemCount = SIBLINGS * 2 + BOUNDARIES;
                const leftRange = range(1, leftItemCount);

                return (
                  <>
                    {leftRange.map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`
                          min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                          ${
                            currentPage === page
                              ? 'bg-blue-600 text-white font-medium border-blue-700'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                          }
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                          transition-colors duration-200
                        `}>
                        {page}
                      </button>
                    ))}

                    <button
                      disabled
                      className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                      <span className='text-center'>•••</span>
                    </button>

                    <button
                      onClick={() => handlePageChange(totalPageCount)}
                      disabled={isLoading}
                      className={`
                        min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                        ${
                          currentPage === totalPageCount
                            ? 'bg-blue-600 text-white font-medium border-blue-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        transition-colors duration-200
                      `}>
                      {totalPageCount}
                    </button>
                  </>
                );
              }

              // Case 3: Show right dots but no left dots
              if (shouldShowLeftDots && !shouldShowRightDots) {
                const rightItemCount = SIBLINGS * 2 + BOUNDARIES;
                const rightRange = range(totalPageCount - rightItemCount + 1, totalPageCount);

                return (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={isLoading}
                      className={`
                        min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                        ${
                          currentPage === 1
                            ? 'bg-blue-600 text-white font-medium border-blue-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        transition-colors duration-200
                      `}>
                      1
                    </button>

                    <button
                      disabled
                      className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                      <span className='text-center'>•••</span>
                    </button>

                    {rightRange.map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`
                          min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                          ${
                            currentPage === page
                              ? 'bg-blue-600 text-white font-medium border-blue-700'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                          }
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                          transition-colors duration-200
                        `}>
                        {page}
                      </button>
                    ))}
                  </>
                );
              }

              // Case 4: Show both left and right dots
              if (shouldShowLeftDots && shouldShowRightDots) {
                const middleRange = range(leftSiblingIndex, rightSiblingIndex);

                return (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={isLoading}
                      className={`
                        min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                        ${
                          currentPage === 1
                            ? 'bg-blue-600 text-white font-medium border-blue-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        transition-colors duration-200
                      `}>
                      1
                    </button>

                    <button
                      disabled
                      className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                      <span className='text-center'>•••</span>
                    </button>

                    {middleRange.map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`
                          min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                          ${
                            currentPage === page
                              ? 'bg-blue-600 text-white font-medium border-blue-700'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                          }
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                          transition-colors duration-200
                        `}>
                        {page}
                      </button>
                    ))}

                    <button
                      disabled
                      className='border-t border-b border-r min-w-[2rem] px-3 py-1.5 bg-zinc-900 text-zinc-500 border-zinc-800 flex items-center justify-center'>
                      <span className='text-center'>•••</span>
                    </button>

                    <button
                      onClick={() => handlePageChange(totalPageCount)}
                      disabled={isLoading}
                      className={`
                        min-w-[2rem] px-3 py-1.5 cursor-pointer border-t border-b border-r
                        ${
                          currentPage === totalPageCount
                            ? 'bg-blue-600 text-white font-medium border-blue-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        transition-colors duration-200
                      `}>
                      {totalPageCount}
                    </button>
                  </>
                );
              }
            })()}

            {/* Next button */}
            <button
              onClick={() => handlePageChange(Math.min(pagination.totalPages, currentPage + 1))}
              disabled={isLoading || currentPage === pagination.totalPages}
              className={`
                flex items-center justify-center
                px-2 py-1.5 rounded-r-md border-t border-r border-b cursor-pointer
                ${currentPage === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : ''}
                bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300
                transition-colors duration-200
              `}>
              <ChevronRight className='h-3 w-3' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
