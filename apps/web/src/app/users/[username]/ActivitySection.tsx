'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleDot,
  Clock,
  MessageSquare,
  Reply,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UserComment } from './page';

// Helper function to determine activity type and icon
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

export function ActivitySection({
  comments,
  totalActivities,
}: {
  comments: UserComment[];
  totalActivities: number;
}) {
  const [sortFilter, setSortFilter] = useState<SortFilter>('recent');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleComments, setVisibleComments] = useState(comments);

  // Calculate counts for different activity types
  const commentsCount = useMemo(
    () => comments.filter((c) => !c.isReply && !c.isUpvote && !c.isDownvote).length,
    [comments],
  );
  const repliesCount = useMemo(() => comments.filter((c) => c.isReply).length, [comments]);
  const upvotesCount = useMemo(() => comments.filter((c) => c.isUpvote).length, [comments]);
  const downvotesCount = useMemo(() => comments.filter((c) => c.isDownvote).length, [comments]);

  // Apply both sorting and type filtering
  const applyFilters = (sort: SortFilter, type: TypeFilter, data: UserComment[]) => {
    // First, filter by activity type
    let filtered = [...data];
    if (type !== 'all') {
      filtered = data.filter((comment) => {
        if (type === 'comments')
          return !comment.isReply && !comment.isUpvote && !comment.isDownvote;
        if (type === 'replies') return comment.isReply;
        if (type === 'upvotes') return comment.isUpvote;
        if (type === 'downvotes') return comment.isDownvote;
        return true;
      });
    }

    // Then, sort the filtered results
    if (sort === 'popular') {
      return filtered.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
    } else {
      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
  };

  // Handle sort filter change
  const handleSortFilterChange = (filter: SortFilter) => {
    setSortFilter(filter);
    setVisibleComments(applyFilters(filter, typeFilter, comments));
    setCurrentPage(1);
  };

  // Handle type filter change
  const handleTypeFilterChange = (filter: TypeFilter) => {
    setTypeFilter(filter);
    setVisibleComments(applyFilters(sortFilter, filter, comments));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Would fetch the appropriate page in a real implementation
  };

  // Initial filters application (on mount and when comments change)
  useEffect(() => {
    setVisibleComments(applyFilters(sortFilter, typeFilter, comments));
  }, [comments, sortFilter, typeFilter]);

  return (
    <div className='mb-12'>
      {/* Activity header with integrated filter tabs */}
      <div className='mb-6 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden'>
        <div className='p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold flex items-center gap-2 text-white/90'>
              <span className='w-6 h-6 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400'>
                <Clock className='h-3.5 w-3.5' />
              </span>
              Activity
            </h2>

            {/* Sort Filters - Shows next to title on mobile */}
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

        {/* Type Filters - Integrated tabs */}
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
              count={commentsCount}
            />
            <TypeFilterTab
              active={typeFilter === 'replies'}
              onClick={() => handleTypeFilterChange('replies')}
              icon={<Reply className='h-3.5 w-3.5' />}
              color='text-purple-400'
              label='Replies'
              count={repliesCount}
            />
            <TypeFilterTab
              active={typeFilter === 'upvotes'}
              onClick={() => handleTypeFilterChange('upvotes')}
              icon={<ThumbsUp className='h-3.5 w-3.5' />}
              color='text-green-400'
              label='Upvotes'
              count={upvotesCount}
            />
            <TypeFilterTab
              active={typeFilter === 'downvotes'}
              onClick={() => handleTypeFilterChange('downvotes')}
              icon={<ThumbsDown className='h-3.5 w-3.5' />}
              color='text-red-400'
              label='Downvotes'
              count={downvotesCount}
            />
          </div>
        </div>
      </div>

      {/* No results message */}
      {visibleComments.length === 0 && (
        <div className='py-12 text-center bg-zinc-900/20 backdrop-blur-sm border border-zinc-800/30 rounded-xl'>
          <p className='text-zinc-500 text-sm'>
            No {typeFilter !== 'all' ? typeFilter : 'activities'} found.
          </p>
        </div>
      )}

      {/* Cards Grid Layout */}
      <div className='space-y-3'>
        {visibleComments.map((comment) => {
          const activityDetails = getActivityDetails(comment);

          return (
            <div key={comment.id} className='relative group'>
              {/* Update container to preserve hover states when interacting with nested elements */}
              <div
                className={`
                  group bg-zinc-900/30 hover:bg-zinc-900/50 backdrop-blur-sm border 
                  ${activityDetails.borderColor}
                  rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md
                `}>
                {/* Make the content area clickable using Link */}
                <Link
                  href={`/tokens/${comment.tokenMintAddress}?comment=${comment.id}`}
                  className='block cursor-pointer'>
                  {/* Comment Header - More compact */}
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

                  {/* Comment Content - More compact */}
                  <div className='px-4 py-2.5'>
                    <p className='text-zinc-300 text-sm line-clamp-2'>{comment.content}</p>
                  </div>

                  {/* Comment Footer - More compact */}
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

                {/* View Thread button that remains separately clickable */}
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

      {/* Pagination UI - Enhanced with just page numbers */}
      {visibleComments.length > 0 && (
        <div className='mt-6 flex items-center justify-between'>
          <div className='text-xs text-zinc-500'>
            Showing {visibleComments.length} of {totalActivities} activities
          </div>

          <div className='flex text-xs'>
            {/* Always show at least 5 pagination buttons for demo purposes */}
            {Array.from({ length: Math.max(5, Math.ceil(totalActivities / 5)) }, (_, i) => i + 1)
              .slice(0, 5)
              .map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`
                  px-3 py-1.5 cursor-pointer
                  ${page === 1 ? 'rounded-l-md' : ''} 
                  ${page === 5 ? 'rounded-r-md' : ''}
                  ${
                    currentPage === page
                      ? 'bg-blue-600 text-white font-medium border border-blue-700'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
                  }
                  transition-colors duration-200
                `}>
                  {page}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
