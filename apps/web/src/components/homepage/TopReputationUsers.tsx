import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { leaderboards } from '@/lib/api';
import { formatLargeNumber, getHighResAvatar } from '@/lib/utils';
import { LeaderboardCategory, LeaderboardTimeframe, UserReputation } from '@dyor-hub/types';
import { Award, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

export const TopReputationUsers: React.FC = () => {
  const [users, setUsers] = useState<UserReputation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await leaderboards.getPaginatedLeaderboard(
          LeaderboardCategory.REPUTATION,
          LeaderboardTimeframe.ALL_TIME,
          1, // Page 1
          8, // Limit 8
        );
        setUsers(result.users?.slice(0, 8) || []);
      } catch {
        setError('Failed to load users.');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const nextSlide = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: carouselRef.current.offsetWidth / 2,
        behavior: 'smooth',
      });
    }
  };

  const prevSlide = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: -carouselRef.current.offsetWidth / 2,
        behavior: 'smooth',
      });
    }
  };

  const renderSkeleton = () => (
    <div className='flex gap-4 overflow-hidden pb-4'>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className='flex-shrink-0 w-40 flex flex-col items-center p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/60'>
          <Skeleton className='h-14 w-14 rounded-full mb-3' />
          <Skeleton className='h-4 w-3/4 mb-2' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <p className='text-sm text-red-500 text-center py-4'>{error}</p>;
    }

    if (users.length === 0) {
      return <p className='text-sm text-zinc-500 text-center py-4'>No users found.</p>;
    }

    return (
      <div
        ref={carouselRef}
        className='flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent'>
        {users.map((user, index) => {
          const userAvatarSrc = user.avatarUrl && getHighResAvatar(user.avatarUrl);

          const medalClasses = {
            bgColor:
              index === 0
                ? 'bg-amber-500/20'
                : index === 1
                  ? 'bg-zinc-300/20'
                  : index === 2
                    ? 'bg-amber-700/20'
                    : 'bg-zinc-800/80',
            borderColor:
              index === 0
                ? 'border-amber-500/40'
                : index === 1
                  ? 'border-zinc-400/40'
                  : index === 2
                    ? 'border-amber-700/40'
                    : 'border-zinc-700/40',
            textColor:
              index === 0
                ? 'text-amber-500'
                : index === 1
                  ? 'text-zinc-300'
                  : index === 2
                    ? 'text-amber-700'
                    : 'text-zinc-500',
          };

          const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

          return (
            <Link
              href={`/users/${user.username}`}
              key={user.userId}
              className={`flex-shrink-0 w-40 flex flex-col items-center p-4 rounded-xl ${medalClasses.bgColor} border ${medalClasses.borderColor} hover:bg-zinc-800/60 transition-all duration-300 snap-start group`}>
              {medalEmoji && (
                <div className='mb-1'>
                  <span className='text-lg'>{medalEmoji}</span>
                </div>
              )}

              <Avatar className='h-16 w-16 border-2 border-zinc-700 group-hover:border-zinc-600 transition-colors mb-3'>
                <AvatarImage src={userAvatarSrc ?? undefined} alt={user.displayName} />
                <AvatarFallback className='text-base bg-zinc-800'>
                  {user.displayName?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>

              <div className='text-center mb-2 w-full'>
                <p className='text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors'>
                  {user.displayName}
                </p>
                <p className='text-xs text-zinc-500 truncate'>@{user.username}</p>
              </div>

              <div className='flex items-center gap-1 bg-zinc-800/70 px-2 py-1 rounded-full'>
                <Award className='h-3 w-3 text-amber-400' />
                <span className='text-xs font-medium text-zinc-300'>
                  {formatLargeNumber(user.totalPoints || 0)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Card className='border-zinc-800/60 bg-zinc-900/40 overflow-hidden'>
      <CardHeader className='pb-3 flex flex-row items-center justify-between'>
        <div className='flex items-center'>
          <div className='p-1.5 bg-amber-500/20 rounded-lg mr-2'>
            <Trophy className='h-4 w-4 text-amber-500' />
          </div>
          <CardTitle className='text-lg font-medium text-white'>Top Contributors</CardTitle>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-full hover:bg-zinc-800'
            onClick={prevSlide}>
            <ChevronLeft className='h-4 w-4 text-zinc-400' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-full hover:bg-zinc-800'
            onClick={nextSlide}>
            <ChevronRight className='h-4 w-4 text-zinc-400' />
          </Button>

          <Button
            asChild
            variant='outline'
            size='sm'
            className='text-zinc-400 hover:text-white h-7 ml-2'>
            <Link href='/leaderboard'>View All</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className='px-6'>{isLoading ? renderSkeleton() : renderContent()}</CardContent>
    </Card>
  );
};
