'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { gamification } from '@/lib/api';
import { UserBadge, UserStreak } from '@dyor-hub/types';
import { Award, Flame, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProfileStatsProps {
  userId: string;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      // Fetch badges
      try {
        setIsLoadingBadges(true);
        gamification.badges.clearBadgesCache(userId);
        const badgesData = await gamification.badges.getUserBadges(userId);
        setBadges(badgesData);
      } catch (err) {
        console.error('Error fetching user badges:', err);
      } finally {
        setIsLoadingBadges(false);
      }

      // Fetch streak
      try {
        setIsLoadingStreak(true);
        const streakData = await gamification.streaks.getUserStreak(userId);
        setStreak(streakData);
      } catch (err) {
        console.error('Error fetching user streak:', err);
      } finally {
        setIsLoadingStreak(false);
      }
    }

    fetchData();
  }, [userId]);

  // Group badges by category
  const badgesByCategory = badges.reduce(
    (acc, badge) => {
      const category = badge.badge.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(badge);
      return acc;
    },
    {} as Record<string, UserBadge[]>,
  );

  // For each category, only show the highest level badge (highest threshold value)
  const topBadges = Object.values(badgesByCategory).map((categoryBadges) => {
    // Sort by threshold value in descending order
    const sortedBadges = [...categoryBadges].sort(
      (a, b) => b.badge.thresholdValue - a.badge.thresholdValue,
    );
    return sortedBadges[0]; // Return the highest level badge
  });

  const isLoading = isLoadingBadges || isLoadingStreak;
  const hasBadges = badges.length > 0;
  const hasStreak = streak && (streak.currentStreak > 0 || streak.longestStreak > 0);
  const hasLongestStreak = streak && streak.longestStreak > 0;
  const hasContent = hasBadges || hasStreak;

  if (isLoading) {
    return (
      <div className='mt-4 md:mt-3.5 flex flex-col md:flex-row items-center gap-2'>
        <div className='flex flex-wrap justify-center gap-2'>
          <Skeleton className='h-5 w-16 rounded-md' />
          <Skeleton className='h-5 w-20 rounded-md' />
        </div>
        <div className='hidden md:flex w-0.5 h-3 bg-zinc-700/40 mx-0.5 rounded-full self-center'></div>
        <div className='flex flex-wrap justify-center gap-2 mt-1 md:mt-0'>
          <Skeleton className='h-5 w-14 rounded-full' />
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>
      </div>
    );
  }

  if (!hasContent) return null;

  // Choose streak indicator based on length
  const getStreakEmoji = (days: number) => {
    if (days >= 30) return '🔥🔥🔥';
    if (days >= 14) return '🔥🔥';
    if (days >= 7) return '🔥';
    return '';
  };

  return (
    <div className='mt-4 md:mt-3.5 flex flex-col md:flex-row items-center gap-2'>
      {/* Streak Badges */}
      {hasStreak && (
        <div className='flex flex-wrap justify-center gap-2'>
          {/* Current Streak Badge */}
          {streak?.currentStreak > 0 && (
            <div
              className='inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md border border-orange-500/30 bg-orange-500/10 shadow-sm'
              title='Current active streak'>
              <Flame className='h-3 w-3 text-orange-500' />
              <span className='text-xs font-medium text-orange-500'>
                {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
              </span>
              {streak.currentStreak >= 7 && (
                <span className='text-xs'>{getStreakEmoji(streak.currentStreak)}</span>
              )}
            </div>
          )}

          {/* Longest Streak Badge - Only show if different from current */}
          {hasLongestStreak && streak.longestStreak > streak.currentStreak && (
            <div
              className='inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md border border-orange-500/30 bg-orange-500/10 shadow-sm'
              title='Best streak ever achieved'>
              <Trophy className='h-3 w-3 text-orange-500' />
              <span className='text-xs font-medium text-orange-500'>
                Best: {streak.longestStreak} day{streak.longestStreak !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Separator - Only visible on desktop */}
      {hasBadges && hasStreak && (
        <div className='hidden md:flex w-0.5 h-3 bg-zinc-700/40 mx-0.5 rounded-full self-center'></div>
      )}

      {/* Achievement Badges */}
      {hasBadges && (
        <div className='flex flex-wrap justify-center gap-2 mt-1 md:mt-0'>
          {topBadges.map((badge) => (
            <div
              key={badge.id}
              className='inline-flex items-center gap-1 py-0.5 px-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/15 transition-colors shadow-sm'
              title={badge.badge.description}>
              <Award className='h-3 w-3 text-green-500' />
              <span className='text-xs font-medium'>{badge.badge.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
