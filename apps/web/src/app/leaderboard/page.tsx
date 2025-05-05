'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { leaderboards, referrals, tokenCallsLeaderboard } from '@/lib/api';
import { cn, formatLargeNumber, getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import {
  LeaderboardCategory,
  LeaderboardTimeframe,
  ReferralLeaderboardEntry,
} from '@dyor-hub/types';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Heart,
  HelpCircle,
  Loader2,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CombinedLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  rank?: number;
  // Reputation/Gamification specific
  totalPoints?: number;
  // Token Call specific
  totalCalls?: number;
  successfulCalls?: number;
  accuracyRate?: number;
  averageTimeToHitRatio?: number | null;
  averageMultiplier?: number | null;
  averageMarketCapAtCallTime?: number | null;
  // Referral specific
  referralCount?: number;
}

interface CurrentUserPosition {
  rank: number;
  points?: number;
  accuracyRate?: number;
  totalCalls?: number;
  successfulCalls?: number;
  averageTimeToHitRatio?: number | null;
  averageMultiplier?: number | null;
  averageMarketCapAtCallTime?: number | null;
  foundInCurrentPage: boolean;
  referralCount?: number;
}

type UiCategory = LeaderboardCategory | 'tokenCalls' | 'reputation' | 'referrals';

// Corrected Mapping (Assuming snake_case for enum keys)
const categoryMapping: Record<UiCategory, LeaderboardCategory | 'tokenCalls' | 'referrals'> = {
  reputation: LeaderboardCategory.REPUTATION,
  tokenCalls: 'tokenCalls',
  referrals: 'referrals',
  posts: LeaderboardCategory.POSTS,
  comments: LeaderboardCategory.COMMENTS,
  upvotes_given: LeaderboardCategory.UPVOTES_GIVEN,
  upvotes_received: LeaderboardCategory.UPVOTES_RECEIVED,
};

// Define explicit tab order
const tabOrder: UiCategory[] = [
  'tokenCalls',
  'reputation',
  'referrals',
  LeaderboardCategory.POSTS,
  LeaderboardCategory.COMMENTS,
  LeaderboardCategory.UPVOTES_GIVEN,
  LeaderboardCategory.UPVOTES_RECEIVED,
];

const getCategoryIcon = (category: UiCategory) => {
  switch (category) {
    case LeaderboardCategory.REPUTATION:
      return TrendingUp;
    case LeaderboardCategory.POSTS:
    case LeaderboardCategory.COMMENTS:
      return MessageSquare;
    case LeaderboardCategory.UPVOTES_GIVEN:
      return ThumbsUp;
    case LeaderboardCategory.UPVOTES_RECEIVED:
      return Heart;
    case 'tokenCalls':
      return CheckCircle;
    case 'referrals':
      return Users;
    default:
      return Trophy;
  }
};

const formatCategoryName = (category: UiCategory) => {
  switch (category) {
    case 'reputation':
      return 'Reputation';
    case 'posts':
      return 'Posts';
    case 'comments':
      return 'Comments';
    case 'upvotes_given':
      return 'Upvotes Given';
    case 'upvotes_received':
      return 'Upvotes Received';
    case 'tokenCalls':
      return 'Token Calls';
    case 'referrals':
      return 'Top Referrers';
    default:
      return 'Leaderboard';
  }
};

const LeaderboardPage = () => {
  const { user, isAuthenticated } = useAuthContext();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get the initial category from URL search params or default to 'tokenCalls'
  const [activeCategory, setActiveCategory] = useState<UiCategory>(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && Object.keys(categoryMapping).includes(categoryParam as UiCategory)) {
      return categoryParam as UiCategory;
    }
    return 'tokenCalls';
  });

  const [entries, setEntries] = useState<CombinedLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserPosition, setCurrentUserPosition] = useState<CurrentUserPosition | null>(null);
  const [referralEntries, setReferralEntries] = useState<ReferralLeaderboardEntry[]>([]);
  const [referralError, setReferralError] = useState<string | null>(null);

  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const showPodium = page === 1 && entries.length >= 3 && !isLoading && !error;

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentUserPosition(null);

    try {
      let mappedEntries: CombinedLeaderboardEntry[] = [];

      if (activeCategory === 'tokenCalls') {
        // --- Fetch Token Calls Leaderboard ---
        const data = await tokenCallsLeaderboard.getLeaderboard(page, pageSize);
        mappedEntries = data.items.map((item) => ({
          userId: item.user.id,
          username: item.user.username,
          displayName: item.user.displayName,
          avatarUrl: item.user.avatarUrl,
          rank: item.rank,
          totalCalls: item.totalCalls,
          successfulCalls: item.successfulCalls,
          accuracyRate: item.accuracyRate,
          averageTimeToHitRatio: item.averageTimeToHitRatio,
          averageMultiplier: item.averageMultiplier,
          averageMarketCapAtCallTime: item.averageMarketCapAtCallTime,
        }));
        setTotalPages(Math.ceil(data.total / data.limit));

        // Find current user position within fetched token call data
        if (isAuthenticated && user) {
          const userEntry = mappedEntries.find((entry) => entry.userId === user.id);
          if (userEntry) {
            setCurrentUserPosition({
              rank: userEntry.rank ?? 0,
              accuracyRate: userEntry.accuracyRate,
              totalCalls: userEntry.totalCalls,
              successfulCalls: userEntry.successfulCalls,
              averageTimeToHitRatio: userEntry.averageTimeToHitRatio,
              averageMultiplier: userEntry.averageMultiplier,
              averageMarketCapAtCallTime: userEntry.averageMarketCapAtCallTime,
              foundInCurrentPage: true,
            });
          }
        }
      } else {
        // --- Fetch Gamification/Reputation Leaderboard ---
        const apiCategory = categoryMapping[activeCategory] as LeaderboardCategory;
        const activeTimeframe = LeaderboardTimeframe.ALL_TIME; // Using ALL_TIME for non-token call leaderboards

        const data = await leaderboards.getPaginatedLeaderboard(
          apiCategory,
          activeTimeframe,
          page,
          pageSize,
        );
        // Map reputation data and calculate rank
        const reputationEntries = data.users.map((u) => ({
          userId: u.userId,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          totalPoints: u.totalPoints,
        }));
        // Sort by points first to determine order
        reputationEntries.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
        // Assign rank based on sorted order and pagination
        mappedEntries = reputationEntries.map((entry, index) => ({
          ...entry,
          rank: (page - 1) * pageSize + index + 1, // Calculate rank here
        }));

        if (data.meta) {
          setTotalPages(data.meta.totalPages);
        }

        // Fetch specific user position for reputation leaderboards
        if (isAuthenticated && user) {
          try {
            const userPositionData = await leaderboards.getUserPosition(
              apiCategory,
              activeTimeframe,
            );
            const userInCurrentPage = mappedEntries.some((u) => u.userId === user.id);
            setCurrentUserPosition({
              rank: userPositionData.rank,
              points: userPositionData.points,
              foundInCurrentPage: userInCurrentPage,
            });
          } catch {
            setCurrentUserPosition(null);
          }
        }
      }
      setEntries(mappedEntries);
    } catch {
      setError('Failed to load leaderboard data. Please try again later.');
      setEntries([]); // Clear entries on error
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, page, pageSize, isAuthenticated, user]);

  const fetchReferralLeaderboard = useCallback(async () => {
    if (activeCategory !== 'referrals') return;

    setReferralError(null);

    try {
      const data = await referrals.getLeaderboard(page, pageSize);
      setReferralEntries(data.data);
      setTotalPages(data.meta.totalPages);

      if (page > data.meta.totalPages && data.meta.totalPages > 0) {
        setPage(data.meta.totalPages);
      } else if (page <= 0 && data.meta.totalPages >= 1) {
        setPage(1);
      }
    } catch {
      setReferralError('Failed to load referral leaderboard data.');
      setReferralEntries([]);
      setTotalPages(1);
    }
  }, [activeCategory, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isMounted) setIsLoading(true);
      if (isMounted) setError(null);
      if (isMounted) setReferralError(null);

      try {
        if (activeCategory === 'referrals') {
          await fetchReferralLeaderboard();
        } else {
          await fetchLeaderboard();
        }
      } catch (err) {
        console.error('Main fetch useEffect error:', err);
        if (isMounted) setError('Failed to load leaderboard data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeCategory, page, pageSize, fetchLeaderboard, fetchReferralLeaderboard]);

  // Update state when URL parameters change
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const pageParam = searchParams.get('page');

    // Update category if it exists in the URL and is valid
    if (categoryParam && Object.keys(categoryMapping).includes(categoryParam as UiCategory)) {
      setActiveCategory(categoryParam as UiCategory);
    }

    // Update page if it exists in the URL
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        setPage(parsedPage);
      }
    }
  }, [searchParams]);

  const handleCategoryChange = (category: UiCategory) => {
    // Check if the selected category key exists in our mapping
    if (categoryMapping.hasOwnProperty(category)) {
      setActiveCategory(category);
      setPage(1);

      // Update URL with selected category
      const params = new URLSearchParams(searchParams);
      params.set('category', category);
      params.set('page', '1');
      router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
    } else {
      console.warn(`Invalid category selected: ${category}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);

    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  };

  const formatAccuracyRate = (rate: number | undefined | null) => {
    if (rate === undefined || rate === null) return '-';
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatAvgTimeToHit = (ratio: number | undefined | null) => {
    if (ratio === undefined || ratio === null) return '-';
    return `${(ratio * 100).toFixed(1)}%`;
  };

  const formatAvgMultiplier = (multiplier: number | undefined | null) => {
    if (multiplier === undefined || multiplier === null) return '-';
    return `${multiplier.toFixed(2)}x`;
  };

  const formatHitRate = (successfulCalls?: number, totalCalls?: number) => {
    if (!totalCalls || totalCalls === 0 || successfulCalls === undefined) return '-';
    return `${((successfulCalls / totalCalls) * 100).toFixed(1)}%`;
  };

  return (
    <TooltipProvider>
      <div className='container max-w-6xl py-8 md:py-12'>
        {/* Header */}
        <div className='flex flex-col items-center text-center mb-6'>
          <div className='bg-zinc-900/50 rounded-full p-3 mb-4 border border-zinc-800/80'>
            <Trophy className='h-10 w-10 text-amber-400' />
          </div>
          <h1 className='text-3xl md:text-4xl font-bold tracking-tight mb-2'>Leaderboard</h1>
          <p className='text-zinc-400 max-w-2xl'>
            {activeCategory === 'tokenCalls'
              ? 'See who leads in token call accuracy and activity.'
              : activeCategory === 'referrals'
                ? 'Check out the top referrers bringing new users to the platform.'
                : 'Discover the top contributors in our community. Climb the ranks by engaging.'}
          </p>
        </div>

        {/* Category Tabs */}
        <div className='flex flex-col gap-4 mb-4'>
          <div className='bg-black/30 p-2 sm:p-2 rounded-xl border border-zinc-800/50 overflow-x-auto'>
            <div className='w-full flex items-center min-w-min'>
              {tabOrder.map((categoryKey) => {
                // Ensure the key is valid before proceeding
                if (!categoryMapping.hasOwnProperty(categoryKey)) return null;
                const CategoryIcon = getCategoryIcon(categoryKey);
                return (
                  <button
                    key={categoryKey}
                    onClick={() => handleCategoryChange(categoryKey)}
                    className={cn(
                      'flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg justify-center transition-all cursor-pointer whitespace-nowrap flex-shrink-0',
                      activeCategory === categoryKey
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-100',
                    )}>
                    <CategoryIcon className='h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0' />
                    <span className='text-sm sm:text-sm'>{formatCategoryName(categoryKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error State */}
        {(error || referralError) && (
          <div className='rounded-lg overflow-hidden'>
            <div className='p-6 bg-red-500/20 border border-red-600/30 rounded-lg'>
              <p className='text-red-400 text-center'>{error || referralError}</p>
            </div>
          </div>
        )}
        {/* Loading State */}
        {isLoading && (
          <div className='flex flex-col items-center justify-center min-h-[400px]'>
            <Loader2 className='h-12 w-12 text-primary animate-spin mb-4' />
            <p className='text-zinc-400'>Loading leaderboard...</p>
          </div>
        )}
        {/* Empty State */}
        {!isLoading &&
          !error &&
          !referralError &&
          ((activeCategory !== 'referrals' && entries.length === 0) ||
            (activeCategory === 'referrals' && referralEntries.length === 0)) && (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              {(() => {
                const Icon = getCategoryIcon(activeCategory);
                return <Icon className='h-24 w-24 text-white/10 mb-6' />;
              })()}
              <h3 className='text-xl font-semibold mb-2'>No data available</h3>
              <p className='text-zinc-400 max-w-md'>
                There are no rankings available for this category yet.
              </p>
            </div>
          )}

        {/* Leaderboard Content */}
        {!isLoading && !error && activeCategory !== 'referrals' && entries.length > 0 && (
          <div className='rounded-lg overflow-hidden shadow-lg border border-zinc-800/60 bg-black/20 backdrop-blur-sm'>
            {/* Podium */}
            {showPodium && (
              <div className='grid grid-cols-3 gap-4 p-6 bg-zinc-900/20 border-b border-zinc-800/60'>
                {/* Second Place */}
                <div className='flex flex-col items-center justify-end order-1'>
                  <div className='relative w-full flex flex-col items-center pb-4'>
                    <div className='bg-zinc-800/80 border border-zinc-700/50 rounded-full p-1 mb-3'>
                      <Avatar className='h-16 w-16 md:h-16 md:w-16 border-2 border-gray-300/30'>
                        <AvatarImage
                          src={getHighResAvatar(entries[1].avatarUrl)}
                          alt={entries[1].username}
                        />
                        <AvatarFallback className='bg-gradient-to-br from-gray-700 to-gray-900 text-base'>
                          {entries[1].username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className='font-bold text-xs md:text-sm mb-1 truncate max-w-[90%] text-center'>
                      <Link href={`/users/${entries[1].username}`} className='hover:underline'>
                        {entries[1].displayName}
                      </Link>
                    </h3>
                    {/* Token Call Stats */}
                    <div className='flex flex-col items-center justify-center gap-0.5 text-xs text-gray-300 font-mono font-medium'>
                      {activeCategory === 'tokenCalls' ? (
                        <>
                          {/* Hit Rate */}
                          <span className='text-[10px] text-gray-400 flex items-center gap-1 mt-0.5'>
                            <span className='text-gray-400'>Hit Rate:</span>
                            {formatAccuracyRate(entries[1].accuracyRate)}
                            <span className='ml-1'>
                              ({entries[1].successfulCalls}/{entries[1].totalCalls})
                            </span>
                          </span>
                          {/* Avg Multi Tooltip */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 cursor-help'>
                                Avg Multi: {formatAvgMultiplier(entries[1].averageMultiplier)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average multiplier of successful calls</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-gray-400 flex items-center gap-1 cursor-help'>
                                <span className='mr-0.5'>Time Acc:</span>
                                {formatAvgTimeToHit(entries[1].averageTimeToHitRatio)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>
                                Avg. timing relative to target date (100% = hit on target date).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-gray-400 flex items-center gap-1 cursor-help'>
                                Avg Mcap:{' '}
                                {entries[1].averageMarketCapAtCallTime !== null &&
                                entries[1].averageMarketCapAtCallTime !== undefined
                                  ? `$${formatLargeNumber(entries[1].averageMarketCapAtCallTime)}`
                                  : '-'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average market cap at time of call</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <span>
                          {entries[1].totalPoints?.toLocaleString() ?? '0'}
                          <span className='hidden sm:inline'> pts</span>
                        </span>
                      )}
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
                          src={getHighResAvatar(entries[0].avatarUrl)}
                          alt={entries[0].username}
                        />
                        <AvatarFallback className='bg-gradient-to-br from-amber-700 to-amber-900 text-lg'>
                          {entries[0].username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className='font-bold text-sm md:text-base mb-1 truncate max-w-[90%] text-center'>
                      <Link href={`/users/${entries[0].username}`} className='hover:underline'>
                        {entries[0].displayName}
                      </Link>
                    </h3>
                    {/* Token Call Stats */}
                    <div className='flex flex-col items-center justify-center gap-0.5 text-xs text-amber-400 font-mono font-semibold'>
                      {activeCategory === 'tokenCalls' ? (
                        <>
                          {/* Hit Rate */}
                          <span className='text-[10px] text-amber-500 flex items-center gap-1 mt-0.5'>
                            <span className='text-amber-500'>Hit Rate:</span>
                            {formatAccuracyRate(entries[0].accuracyRate)}
                            <span className='ml-1'>
                              ({entries[0].successfulCalls}/{entries[0].totalCalls})
                            </span>
                          </span>
                          {/* Avg Multi Tooltip */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-500 flex items-center gap-1 mt-0.5 cursor-help'>
                                Avg Multi: {formatAvgMultiplier(entries[0].averageMultiplier)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average multiplier of successful calls</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-500 flex items-center gap-1 cursor-help'>
                                <span className='mr-0.5'>Time Acc:</span>
                                {formatAvgTimeToHit(entries[0].averageTimeToHitRatio)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>
                                Avg. timing relative to target date (100% = hit on target date).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-500 flex items-center gap-1 cursor-help'>
                                Avg Mcap:{' '}
                                {entries[0].averageMarketCapAtCallTime !== null &&
                                entries[0].averageMarketCapAtCallTime !== undefined
                                  ? `$${formatLargeNumber(entries[0].averageMarketCapAtCallTime)}`
                                  : '-'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average market cap at time of call</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <span>
                          {entries[0].totalPoints?.toLocaleString() ?? '0'}
                          <span className='hidden sm:inline'> pts</span>
                        </span>
                      )}
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
                          src={getHighResAvatar(entries[2].avatarUrl)}
                          alt={entries[2].username}
                        />
                        <AvatarFallback className='bg-gradient-to-br from-amber-800 to-amber-950 text-base'>
                          {entries[2].username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className='font-bold text-xs md:text-sm mb-1 truncate max-w-[90%] text-center'>
                      <Link href={`/users/${entries[2].username}`} className='hover:underline'>
                        {entries[2].displayName}
                      </Link>
                    </h3>
                    {/* Token Call Stats */}
                    <div className='flex flex-col items-center justify-center gap-0.5 text-xs text-amber-700/90 font-mono font-medium'>
                      {activeCategory === 'tokenCalls' ? (
                        <>
                          {/* Hit Rate */}
                          <span className='text-[10px] text-amber-600 flex items-center gap-1 mt-0.5'>
                            <span className='text-amber-600'>Hit Rate:</span>
                            {formatAccuracyRate(entries[2].accuracyRate)}
                            <span className='ml-1'>
                              ({entries[2].successfulCalls}/{entries[2].totalCalls})
                            </span>
                          </span>
                          {/* Avg Multi Tooltip */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-600 flex items-center gap-1 mt-0.5 cursor-help'>
                                Avg Multi: {formatAvgMultiplier(entries[2].averageMultiplier)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average multiplier of successful calls</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-600 flex items-center gap-1 cursor-help'>
                                <span className='mr-0.5'>Time Acc:</span>
                                {formatAvgTimeToHit(entries[2].averageTimeToHitRatio)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>
                                Avg. timing relative to target date (100% = hit on target date).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='text-[10px] text-amber-600 flex items-center gap-1 cursor-help'>
                                Avg Mcap:{' '}
                                {entries[2].averageMarketCapAtCallTime !== null &&
                                entries[2].averageMarketCapAtCallTime !== undefined
                                  ? `$${formatLargeNumber(entries[2].averageMarketCapAtCallTime)}`
                                  : '-'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                              <p>Average market cap at time of call</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <span>
                          {entries[2].totalPoints?.toLocaleString() ?? '0'}
                          <span className='hidden sm:inline'> pts</span>
                        </span>
                      )}
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
              <div className='w-10 sm:w-16 text-left'>Rank</div>
              <div className='flex-1 px-1 sm:px-2 text-left'>User</div>
              {activeCategory === 'tokenCalls' ? (
                <>
                  {/* Avg Multi Column */}
                  <div className='w-24 sm:w-28 text-center hidden sm:block'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center justify-center gap-1 w-full cursor-default'>
                        Avg. Multi <HelpCircle className='h-3 w-3 opacity-60' />
                      </TooltipTrigger>
                      <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                        <p>Avg. multiplier of successful calls</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Avg Mcap Column */}
                  <div className='w-24 sm:w-28 text-center hidden md:block'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center justify-center gap-1 w-full cursor-default'>
                        Avg. MCAP <HelpCircle className='h-3 w-3 opacity-60' />
                      </TooltipTrigger>
                      <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                        <p>Average market cap at time of call.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Time Accuracy Column */}
                  <div className='w-28 sm:w-36 text-center hidden md:block'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center justify-center gap-1 w-full cursor-default'>
                        Time Accuracy <HelpCircle className='h-3 w-3 opacity-60' />
                      </TooltipTrigger>
                      <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                        <p>Avg. timing relative to target date (100% = hit on target date).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Hit Rate Column */}
                  <div className='w-24 sm:w-28 text-center'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center justify-center gap-1 w-full cursor-default'>
                        Hit Rate <HelpCircle className='h-3 w-3 opacity-60' />
                      </TooltipTrigger>
                      <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                        <p>Percentage of successful calls out of total calls.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* Calls (Success) Column */}
                  <div className='w-28 sm:w-32 text-right'>Calls (Success)</div>
                </>
              ) : (
                <div className='w-12 sm:w-20 text-right'>Score</div>
              )}
            </div>

            {/* Table Body */}
            <div className='divide-y divide-zinc-800/30'>
              {/* Current User Row - Wrap Avatar with Link */}
              {page === 1 &&
                isAuthenticated &&
                user &&
                currentUserPosition &&
                !currentUserPosition.foundInCurrentPage && (
                  <div className='flex items-center px-4 sm:px-6 py-3 sm:py-4 bg-amber-500/5 border-l-2 border-l-amber-500'>
                    <div className='w-10 sm:w-16 text-left'>
                      <div className='font-semibold text-amber-500 text-sm sm:text-base'>
                        {currentUserPosition.rank > 0 ? currentUserPosition.rank : '-'}
                      </div>
                    </div>
                    <div className='flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2'>
                      <Link href={`/users/${user.username}`}>
                        <Avatar className='h-8 w-8 sm:h-10 sm:w-10 border border-amber-500/40 hover:opacity-80 transition-opacity'>
                          <AvatarImage
                            src={getHighResAvatar(user.avatarUrl)}
                            alt={user.username || 'Your avatar'}
                          />
                          <AvatarFallback className='bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-500 text-xs sm:text-sm'>
                            {user.username ? user.username.substring(0, 2).toUpperCase() : 'YOU'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className='min-w-0 flex-1 text-left'>
                        <p className='font-medium text-amber-500 text-left text-[13px] sm:text-sm'>
                          You
                        </p>
                      </div>
                    </div>
                    {activeCategory === 'tokenCalls' ? (
                      <>
                        {/* Avg Multi - Restored Data */}
                        <div className='w-24 sm:w-28 text-center hidden sm:block'>
                          <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                            {formatAvgMultiplier(currentUserPosition.averageMultiplier)}
                          </div>
                        </div>
                        {/* Avg Mcap */}
                        <div className='w-24 sm:w-28 text-center hidden md:block'>
                          <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                            {currentUserPosition.averageMarketCapAtCallTime !== null &&
                            currentUserPosition.averageMarketCapAtCallTime !== undefined
                              ? `$${formatLargeNumber(currentUserPosition.averageMarketCapAtCallTime)}`
                              : '-'}
                          </div>
                        </div>
                        {/* Time Accuracy */}
                        <div className='w-28 sm:w-36 text-center hidden md:block'>
                          <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                            {formatAvgTimeToHit(currentUserPosition.averageTimeToHitRatio)}
                          </div>
                        </div>
                        {/* Hit Rate */}
                        <div className='w-24 sm:w-28 text-center'>
                          <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                            {formatHitRate(
                              currentUserPosition.successfulCalls,
                              currentUserPosition.totalCalls,
                            )}
                          </div>
                        </div>
                        {/* Calls (Success) */}
                        <div className='w-28 sm:w-32 text-right'>
                          <div className='font-mono font-semibold text-amber-500 text-xs sm:text-sm'>
                            <Link
                              href={`/token-calls?username=${user.username}`}
                              className='hover:underline'>
                              {currentUserPosition.totalCalls?.toLocaleString() ?? '-'}
                            </Link>
                            <span className='text-zinc-500 mx-0.5'>
                              (
                              <span className='text-green-500'>
                                <Link
                                  href={`/token-calls?tab=success&username=${user.username}&status=VERIFIED_SUCCESS`}
                                  className='hover:underline'>
                                  {currentUserPosition.successfulCalls?.toLocaleString() ?? '-'}
                                </Link>
                              </span>
                              )
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className='w-12 sm:w-20 text-right'>
                        <div className='font-mono font-semibold text-xs sm:text-sm text-amber-500'>
                          {currentUserPosition.points !== undefined &&
                          currentUserPosition.points > 0
                            ? `${currentUserPosition.points.toLocaleString()}`
                            : '-'}
                          <span className='hidden sm:inline'>
                            {currentUserPosition.points !== undefined &&
                            currentUserPosition.points > 0
                              ? ' pts'
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Map over entries - Wrap Avatar in Link */}
              {(showPodium ? entries.slice(3) : entries).map((entry, index) => {
                const calculatedRank =
                  entry.rank ?? (showPodium ? index + 4 : (page - 1) * pageSize + index + 1);
                const isCurrentUser = isAuthenticated && user && entry.userId === user.id;
                const getTrophyColor = () => {
                  if (calculatedRank === 1) return 'text-amber-400';
                  if (calculatedRank === 2) return 'text-gray-300';
                  if (calculatedRank === 3) return 'text-amber-700';
                  return 'text-zinc-600';
                };

                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      'flex items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-zinc-900/20 transition-colors',
                      calculatedRank <= 3 && !showPodium && 'bg-zinc-900/30',
                      isCurrentUser && 'bg-amber-500/5 border-l-2 border-l-amber-500',
                    )}>
                    {/* Rank */}
                    <div className='w-10 sm:w-16 text-left'>
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
                    {/* User */}
                    <div className='flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2'>
                      <Link href={`/users/${entry.username}`}>
                        <Avatar
                          className={cn(
                            'h-8 w-8 sm:h-10 sm:w-10 border flex-shrink-0 hover:opacity-80 transition-opacity',
                            isCurrentUser ? 'border-amber-500/40' : 'border-zinc-800',
                          )}>
                          <AvatarImage
                            src={getHighResAvatar(entry.avatarUrl)}
                            alt={entry.username}
                          />
                          <AvatarFallback
                            className={cn(
                              'text-xs sm:text-sm',
                              isCurrentUser
                                ? 'bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-500'
                                : 'bg-gradient-to-br from-zinc-700 to-zinc-900',
                            )}>
                            {entry.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className='min-w-0 flex-1 text-left'>
                        <p
                          className={cn(
                            'font-medium text-[13px] sm:text-sm truncate text-left',
                            isCurrentUser ? 'text-amber-500' : 'text-white',
                          )}>
                          {isCurrentUser ? (
                            'You'
                          ) : (
                            <Link href={`/users/${entry.username}`} className='hover:underline'>
                              {entry.displayName}
                            </Link>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Score/Stats */}
                    {activeCategory === 'tokenCalls' ? (
                      <>
                        {/* Avg Multi */}
                        <div className='w-24 sm:w-28 text-center hidden sm:block'>
                          <div
                            className={cn(
                              'font-mono font-semibold text-xs sm:text-sm',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-300',
                            )}>
                            {formatAvgMultiplier(entry.averageMultiplier)}
                          </div>
                        </div>
                        {/* Avg Mcap */}
                        <div className='w-24 sm:w-28 text-center hidden md:block'>
                          <div
                            className={cn(
                              'font-mono font-semibold text-xs sm:text-sm',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-300',
                            )}>
                            {entry.averageMarketCapAtCallTime !== null &&
                            entry.averageMarketCapAtCallTime !== undefined
                              ? `$${formatLargeNumber(entry.averageMarketCapAtCallTime)}`
                              : '-'}
                          </div>
                        </div>
                        {/* Time Accuracy */}
                        <div className='w-28 sm:w-36 text-center hidden md:block'>
                          <div
                            className={cn(
                              'font-mono font-semibold text-xs sm:text-sm',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-300',
                            )}>
                            {formatAvgTimeToHit(entry.averageTimeToHitRatio)}
                          </div>
                        </div>
                        {/* Hit Rate */}
                        <div className='w-24 sm:w-28 text-center'>
                          <div
                            className={cn(
                              'font-mono font-semibold text-xs sm:text-sm',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-300',
                            )}>
                            {formatHitRate(entry.successfulCalls, entry.totalCalls)}
                          </div>
                        </div>
                        {/* Calls (Success) */}
                        <div className='w-28 sm:w-32 text-right'>
                          <div
                            className={cn(
                              'font-mono font-semibold text-xs sm:text-sm',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-400',
                            )}>
                            {entry.totalCalls?.toLocaleString() ?? '0'}
                            <span className='text-zinc-500 mx-0.5'>
                              (
                              <span className='text-green-500'>
                                <Link
                                  href={`/token-calls?tab=success&username=${entry.username}&status=VERIFIED_SUCCESS`}
                                  className='hover:underline'>
                                  {entry.successfulCalls?.toLocaleString() ?? '-'}
                                </Link>
                              </span>
                              )
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
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
                          {entry.totalPoints?.toLocaleString() ?? '0'}
                          <span className='hidden sm:inline'> pts</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Referral Leaderboard Table */}
        {!isLoading &&
          !referralError &&
          activeCategory === 'referrals' &&
          referralEntries.length > 0 && (
            <div className='rounded-lg overflow-hidden shadow-lg border border-zinc-800/60 bg-black/20 backdrop-blur-sm'>
              {/* Table Header for Referrals */}
              <div className='flex items-center px-4 sm:px-6 py-2 sm:py-3 border-b border-zinc-800/70 bg-zinc-900/30 text-sm font-medium text-zinc-400'>
                <div className='w-10 sm:w-16 text-left'>Rank</div>
                <div className='flex-1 px-1 sm:px-2 text-left'>User</div>
                <div className='w-20 sm:w-24 text-right'>Referrals</div>
              </div>

              {/* Table Body for Referrals */}
              <div className='divide-y divide-zinc-800/30'>
                {referralEntries.map((entry, index) => {
                  // Calculate rank based on current page and index
                  const rank = (page - 1) * pageSize + index + 1;
                  const isCurrentUser = isAuthenticated && user && entry.userId === user.id;
                  const getTrophyColor = () => {
                    if (rank === 1) return 'text-amber-400';
                    if (rank === 2) return 'text-gray-300';
                    if (rank === 3) return 'text-amber-700';
                    return 'text-zinc-600';
                  };

                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        'flex items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-zinc-900/20 transition-colors',
                        rank <= 3 && 'bg-zinc-900/30', // Highlight top 3
                        isCurrentUser && 'bg-amber-500/5 border-l-2 border-l-amber-500',
                      )}>
                      {/* Rank */}
                      <div className='w-10 sm:w-16 text-left'>
                        {rank <= 3 ? (
                          <Trophy className={cn('h-4 w-4 sm:h-5 sm:w-5', getTrophyColor())} />
                        ) : (
                          <div
                            className={cn(
                              'font-semibold text-sm sm:text-base',
                              isCurrentUser ? 'text-amber-500' : 'text-zinc-500',
                            )}>
                            {rank}
                          </div>
                        )}
                      </div>
                      {/* User */}
                      <div className='flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2'>
                        <Link href={`/users/${entry.username}`}>
                          <Avatar
                            className={cn(
                              'h-8 w-8 sm:h-10 sm:w-10 border flex-shrink-0 hover:opacity-80 transition-opacity',
                              isCurrentUser ? 'border-amber-500/40' : 'border-zinc-800',
                            )}>
                            <AvatarImage
                              src={getHighResAvatar(entry.avatarUrl)}
                              alt={entry.username}
                            />
                            <AvatarFallback
                              className={cn(
                                'text-xs sm:text-sm',
                                isCurrentUser
                                  ? 'bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-amber-500'
                                  : 'bg-gradient-to-br from-zinc-700 to-zinc-900',
                              )}>
                              {entry.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className='min-w-0 flex-1 text-left'>
                          <p
                            className={cn(
                              'font-medium text-[13px] sm:text-sm truncate text-left',
                              isCurrentUser ? 'text-amber-500' : 'text-white',
                            )}>
                            {isCurrentUser ? (
                              'You'
                            ) : (
                              <Link href={`/users/${entry.username}`} className='hover:underline'>
                                {entry.displayName}
                              </Link>
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Referral Count */}
                      <div className='w-20 sm:w-24 text-right'>
                        <div
                          className={cn(
                            'font-mono font-semibold text-xs sm:text-sm',
                            isCurrentUser
                              ? 'text-amber-500'
                              : rank === 1
                                ? 'text-amber-400'
                                : rank === 2
                                  ? 'text-gray-300'
                                  : rank === 3
                                    ? 'text-amber-700'
                                    : 'text-zinc-400',
                          )}>
                          {entry.referralCount.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Pagination */}
        {totalPages > 1 && !isLoading && !(error || referralError) && (
          <div className='flex justify-center mt-8'>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default LeaderboardPage;
