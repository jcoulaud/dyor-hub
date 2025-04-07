'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { leaderboards } from '@/lib/api';
import { cn, getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { LeaderboardCategory, LeaderboardTimeframe } from '@dyor-hub/types';
import { motion } from 'framer-motion';
import { Crown, Heart, Loader2, MessageSquare, ThumbsUp, TrendingUp, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface EnhancedUserReputation {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  totalPoints: number;
  weeklyPoints: number;
}

interface CurrentUserPosition {
  rank: number;
  points: number;
  foundInCurrentPage: boolean;
}

const categoryMapping: Record<string, LeaderboardCategory> = {
  reputation: LeaderboardCategory.REPUTATION,
  posts: LeaderboardCategory.POSTS,
  comments: LeaderboardCategory.COMMENTS,
  upvotes_given: LeaderboardCategory.UPVOTES_GIVEN,
  upvotes_received: LeaderboardCategory.UPVOTES_RECEIVED,
};

type UiCategory = keyof typeof categoryMapping;

const formatCategoryName = (category: UiCategory): string => {
  switch (category) {
    case 'posts':
      return 'Posts';
    case 'comments':
      return 'Comments';
    case 'upvotes_given':
      return 'Upvotes Given';
    case 'upvotes_received':
      return 'Upvotes Received';
    case 'reputation':
      return 'Reputation';
    default:
      return category as string;
  }
};

const getCategoryIcon = (category: UiCategory) => {
  switch (category) {
    case 'posts':
      return TrendingUp;
    case 'comments':
      return MessageSquare;
    case 'upvotes_given':
      return ThumbsUp;
    case 'upvotes_received':
      return Heart;
    case 'reputation':
      return Crown;
    default:
      return Crown;
  }
};

const formatTimeframeName = (timeframe: LeaderboardTimeframe): string => {
  switch (timeframe) {
    case LeaderboardTimeframe.WEEKLY:
      return 'Weekly';
    case LeaderboardTimeframe.MONTHLY:
      return 'Monthly';
    case LeaderboardTimeframe.ALL_TIME:
      return 'All Time';
    default:
      return timeframe;
  }
};

const LeaderboardPage = () => {
  const { user, isAuthenticated } = useAuthContext();

  const [activeCategory, setActiveCategory] = useState<UiCategory>('reputation');
  const [activeTimeframe, setActiveTimeframe] = useState<LeaderboardTimeframe>(
    LeaderboardTimeframe.WEEKLY,
  );
  const [users, setUsers] = useState<EnhancedUserReputation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserPosition, setCurrentUserPosition] = useState<CurrentUserPosition | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Only show podium if we have enough users and we're on the first page
  const showPodium = page === 1 && users.length >= 3 && !isLoading && !error;

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate that activeCategory is a proper key in the mapping
      if (!categoryMapping[activeCategory]) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      const apiCategory = categoryMapping[activeCategory];

      try {
        const data = await leaderboards.getPaginatedLeaderboard(
          apiCategory,
          activeTimeframe,
          page,
          pageSize,
        );

        // Ensure users are sorted by score from highest to lowest for display purposes
        const sortedUsers = [...data.users].sort((a, b) => b.totalPoints - a.totalPoints);
        setUsers(sortedUsers);

        if (data.meta) {
          setTotalPages(data.meta.totalPages);
        }

        // Fetch the user's position if authenticated
        if (isAuthenticated && user) {
          try {
            const userPositionData = await leaderboards.getUserPosition(
              apiCategory,
              activeTimeframe,
            );

            // Check if the user is in the current page
            const userInCurrentPage = sortedUsers.some((u) => u.userId === user.id);

            setCurrentUserPosition({
              rank: userPositionData.rank,
              points: userPositionData.points,
              foundInCurrentPage: userInCurrentPage,
            });
          } catch {
            setCurrentUserPosition(null);
          }
        } else {
          setCurrentUserPosition(null);
        }
      } catch {
        setError('Failed to load leaderboard data. Please try again later.');
      }
    } catch {
      setError('Failed to load leaderboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, activeTimeframe, page, pageSize, isAuthenticated, user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleCategoryChange = (category: UiCategory) => {
    setActiveCategory(category);
    setPage(1);
  };

  const handleTimeframeChange = (timeframe: LeaderboardTimeframe) => {
    setActiveTimeframe(timeframe);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className='container max-w-6xl py-8 md:py-12'>
      {/* Header */}
      <div className='flex flex-col items-center text-center mb-6'>
        <div className='bg-zinc-900/50 rounded-full p-3 mb-4 border border-zinc-800/80'>
          <Trophy className='h-10 w-10 text-amber-400' />
        </div>
        <h1 className='text-3xl md:text-4xl font-bold tracking-tight mb-2'>Leaderboard</h1>
        <p className='text-zinc-400 max-w-2xl'>
          Discover the top contributors in our community. Climb the ranks by posting, commenting,
          and engaging with others.
        </p>
        <p className='text-xs text-zinc-500 mt-2 max-w-2xl'>
          Weekly rankings reset every Monday. Monthly rankings reset on the 1st of each month.
          Rankings are updated in real-time as you earn points.
        </p>
      </div>

      {/* Filter Controls */}
      <div className='flex flex-col gap-4 mb-4'>
        <div className='flex flex-col gap-4'>
          {/* Timeframe Selector */}
          <div className='flex justify-center md:justify-end'>
            <div className='inline-flex items-center space-x-1 bg-black/30 rounded-md p-1'>
              {Object.values(LeaderboardTimeframe).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => handleTimeframeChange(timeframe)}
                  className={cn(
                    'h-8 px-3 text-sm font-medium rounded transition-colors cursor-pointer',
                    activeTimeframe === timeframe
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
                  )}>
                  {formatTimeframeName(timeframe)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs - Admin-style */}
          <div className='bg-black/30 p-2 sm:p-2 rounded-xl border border-zinc-800/50 overflow-x-auto'>
            <div className='w-full flex items-center min-w-min'>
              {Object.keys(categoryMapping).map((category) => {
                const CategoryIcon = getCategoryIcon(category as UiCategory);
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category as UiCategory)}
                    className={cn(
                      'flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg justify-center transition-all cursor-pointer whitespace-nowrap flex-shrink-0',
                      activeCategory === category
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-100',
                    )}>
                    <CategoryIcon className='h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0' />
                    <span className='text-sm sm:text-sm'>
                      {formatCategoryName(category as UiCategory)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className='rounded-lg overflow-hidden'>
          <div className='p-6 bg-red-500/20 border border-red-600/30 rounded-lg'>
            <p className='text-red-400 text-center'>{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className='flex flex-col items-center justify-center min-h-[400px]'>
          <Loader2 className='h-12 w-12 text-primary animate-spin mb-4' />
          <p className='text-zinc-400'>Loading leaderboard...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && users.length === 0 && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          {(() => {
            const Icon = getCategoryIcon(activeCategory);
            return <Icon className='h-24 w-24 text-white/10 mb-6' />;
          })()}
          <h3 className='text-xl font-semibold mb-2'>No data available</h3>
          <p className='text-zinc-400 max-w-md'>
            There are no rankings available for this category yet. Check back later or try a
            different category.
          </p>
        </div>
      )}

      {/* Content - only show when we have data */}
      {!isLoading && !error && users.length > 0 && (
        <div className='rounded-lg overflow-hidden shadow-lg border border-zinc-800/60 bg-black/20 backdrop-blur-sm'>
          {showPodium && (
            <div className='grid grid-cols-3 gap-4 p-6 bg-zinc-900/20 border-b border-zinc-800/60'>
              {/* Second Place */}
              <div className='flex flex-col items-center justify-end order-1'>
                <div className='relative w-full flex flex-col items-center pb-4'>
                  <div className='bg-zinc-800/80 border border-zinc-700/50 rounded-full p-1 mb-3'>
                    <Avatar className='h-16 w-16 md:h-16 md:w-16 border-2 border-gray-300/30'>
                      <AvatarImage
                        src={getHighResAvatar(users[1].avatarUrl || '')}
                        alt={users[1].username}
                      />
                      <AvatarFallback className='bg-gradient-to-br from-gray-700 to-gray-900 text-base'>
                        {users[1].username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <h3 className='font-bold text-xs md:text-sm mb-1 truncate max-w-[90%] text-center'>
                    {users[1].username}
                  </h3>
                  <div className='flex items-center justify-center gap-1 text-xs text-gray-300 font-mono font-medium'>
                    <span>
                      {users[1].totalPoints.toLocaleString()}
                      <span className='hidden sm:inline'> pts</span>
                    </span>
                  </div>

                  <div className='mt-6 w-full h-12 flex items-center justify-center bg-gray-700/40 rounded-t-md border border-b-0 border-gray-600/30'>
                    <span className='font-black text-2xl text-gray-300'>2</span>
                  </div>
                </div>
              </div>

              {/* First Place */}
              <div className='flex flex-col items-center justify-end order-2'>
                <div className='relative w-full flex flex-col items-center pb-4'>
                  <div className='bg-zinc-800/80 border border-amber-500/30 rounded-full p-1 mb-3'>
                    <Avatar className='h-16 w-16 md:h-20 md:w-20 border-2 border-amber-400/30'>
                      <AvatarImage
                        src={getHighResAvatar(users[0].avatarUrl || '')}
                        alt={users[0].username}
                      />
                      <AvatarFallback className='bg-gradient-to-br from-amber-700 to-amber-900 text-lg'>
                        {users[0].username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <h3 className='font-bold text-sm md:text-base mb-1 truncate max-w-[90%] text-center'>
                    {users[0].username}
                  </h3>
                  <div className='flex items-center justify-center gap-1 text-xs text-amber-400 font-mono font-semibold'>
                    <span>
                      {users[0].totalPoints.toLocaleString()}
                      <span className='hidden sm:inline'> pts</span>
                    </span>
                  </div>

                  <div className='mt-6 w-full h-16 flex items-center justify-center bg-amber-500/40 rounded-t-md border border-b-0 border-amber-500/30'>
                    <span className='font-black text-3xl text-amber-300'>1</span>
                  </div>
                </div>
              </div>

              {/* Third Place */}
              <div className='flex flex-col items-center justify-end order-3'>
                <div className='relative w-full flex flex-col items-center pb-4'>
                  <div className='bg-zinc-800/80 border border-amber-700/30 rounded-full p-1 mb-3'>
                    <Avatar className='h-16 w-16 md:h-16 md:w-16 border-2 border-amber-700/30'>
                      <AvatarImage
                        src={getHighResAvatar(users[2].avatarUrl || '')}
                        alt={users[2].username}
                      />
                      <AvatarFallback className='bg-gradient-to-br from-amber-800 to-amber-950 text-base'>
                        {users[2].username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <h3 className='font-bold text-xs md:text-sm mb-1 truncate max-w-[90%] text-center'>
                    {users[2].username}
                  </h3>
                  <div className='flex items-center justify-center gap-1 text-xs text-amber-700/90 font-mono font-medium'>
                    <span>
                      {users[2].totalPoints.toLocaleString()}
                      <span className='hidden sm:inline'> pts</span>
                    </span>
                  </div>

                  <div className='mt-6 w-full h-10 flex items-center justify-center bg-amber-800/40 rounded-t-md border border-b-0 border-amber-700/30'>
                    <span className='font-black text-2xl text-amber-700/90'>3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className='flex items-center px-4 sm:px-6 py-2 sm:py-3 border-b border-zinc-800/70 bg-zinc-900/30 text-sm font-medium text-zinc-400'>
            <div className='w-10 sm:w-20 text-left'>Rank</div>
            <div className='flex-1 px-1 sm:px-2 text-left'>Player</div>
            <div className='w-12 sm:w-20 text-right'>Score</div>
          </div>

          {/* Table Body */}
          <div className='divide-y divide-zinc-800/30'>
            {/* Current User Row - Only show on page 1 if user is logged in, has position data, and is NOT found in the current page */}
            {page === 1 &&
              isAuthenticated &&
              user &&
              currentUserPosition &&
              !currentUserPosition.foundInCurrentPage && (
                <div className='flex items-center px-4 sm:px-6 py-3 sm:py-4 bg-amber-500/5 border-l-2 border-l-amber-500'>
                  <div className='w-10 sm:w-20 text-left'>
                    <div className='font-semibold text-amber-500 text-sm sm:text-base'>
                      {currentUserPosition.rank > 0 ? currentUserPosition.rank : '-'}
                    </div>
                  </div>
                  <div className='flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2'>
                    <Avatar className='h-8 w-8 sm:h-10 sm:w-10 border border-amber-500/40'>
                      <AvatarImage
                        src={getHighResAvatar(user.avatarUrl || '')}
                        alt={user.username || 'Your avatar'}
                      />
                      <AvatarFallback className='bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-500 text-xs sm:text-sm'>
                        {user.username ? user.username.substring(0, 2).toUpperCase() : 'YOU'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1 text-left'>
                      <p className='font-medium text-amber-500 text-left text-[13px] sm:text-sm'>
                        You
                      </p>
                    </div>
                  </div>
                  <div className='w-12 sm:w-20 text-right'>
                    <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                      {currentUserPosition.points > 0
                        ? `${currentUserPosition.points.toLocaleString()}`
                        : '-'}
                      <span className='hidden sm:inline'>
                        {currentUserPosition.points > 0 ? ' pts' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* If on page 1 and showing podium, start from index 3. Otherwise, show all items */}
            {(showPodium ? users.slice(3) : users).map((leaderboardUser, index) => {
              // Calculate actual position based on pagination and whether we're showing the podium
              const calculatedRank = showPodium
                ? index + 4 // Page 1 with podium: top 3 + index + 1
                : page === 1
                  ? index + 1 // Page 1 without podium: index + 1
                  : (page - 1) * pageSize + index + 1; // Page 2+: (page-1)*pageSize + index + 1

              // Determine trophy color based on rank
              const getTrophyColor = () => {
                if (calculatedRank === 1) return 'text-amber-400';
                if (calculatedRank === 2) return 'text-gray-300';
                if (calculatedRank === 3) return 'text-amber-700';
                return 'text-zinc-600';
              };

              // Check if this is the current logged-in user
              const isCurrentUser = isAuthenticated && user && leaderboardUser.userId === user.id;

              return (
                <motion.div
                  key={leaderboardUser.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    'flex items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-zinc-900/20 transition-colors',
                    calculatedRank <= 3 && 'bg-zinc-900/30',
                    isCurrentUser && 'bg-amber-500/5 border-l-2 border-l-amber-500',
                  )}>
                  {/* Rank */}
                  <div className='w-10 sm:w-20 text-left'>
                    {calculatedRank <= 3 ? (
                      <Trophy className={cn('h-4 w-4 sm:h-5 sm:w-5', getTrophyColor())} />
                    ) : (
                      <div
                        className={cn(
                          'font-semibold text-sm sm:text-base',
                          isCurrentUser ? 'text-amber-500' : 'text-zinc-500',
                        )}>
                        {calculatedRank}
                      </div>
                    )}
                  </div>

                  {/* Player */}
                  <div className='flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2'>
                    <Avatar
                      className={cn(
                        'h-8 w-8 sm:h-10 sm:w-10 border flex-shrink-0',
                        isCurrentUser ? 'border-amber-500/40' : 'border-zinc-800',
                      )}>
                      <AvatarImage
                        src={getHighResAvatar(leaderboardUser.avatarUrl || '')}
                        alt={leaderboardUser.username}
                      />
                      <AvatarFallback
                        className={cn(
                          'text-xs sm:text-sm',
                          isCurrentUser
                            ? 'bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-500'
                            : 'bg-gradient-to-br from-zinc-700 to-zinc-900',
                        )}>
                        {leaderboardUser.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1 text-left'>
                      <p
                        className={cn(
                          'font-medium text-[13px] sm:text-sm truncate text-left',
                          isCurrentUser ? 'text-amber-500' : 'text-white',
                        )}>
                        {isCurrentUser ? 'You' : leaderboardUser.username}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className='w-12 sm:w-20 text-right'>
                    <div
                      className={cn(
                        'font-mono font-semibold text-xs sm:text-sm',
                        isCurrentUser
                          ? 'text-amber-500'
                          : calculatedRank === 1
                            ? 'text-amber-400'
                            : calculatedRank === 2
                              ? 'text-gray-300'
                              : calculatedRank === 3
                                ? 'text-amber-700'
                                : 'text-zinc-400',
                      )}>
                      {leaderboardUser.totalPoints.toLocaleString()}
                      <span className='hidden sm:inline'> pts</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && !error && (
        <div className='flex justify-center mt-8'>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
