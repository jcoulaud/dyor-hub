import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { leaderboards } from '@/lib/api';
import { formatLargeNumber, getHighResAvatar } from '@/lib/utils';
import { LeaderboardCategory, LeaderboardTimeframe, UserReputation } from '@dyor-hub/types';
import { Award, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export const TopReputationUsers: React.FC = () => {
  const [users, setUsers] = useState<UserReputation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await leaderboards.getPaginatedLeaderboard(
          LeaderboardCategory.REPUTATION,
          LeaderboardTimeframe.ALL_TIME,
          1, // Page 1
          10, // Limit 10
        );
        setUsers(result.users || []);
      } catch {
        setError('Failed to load users.');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderSkeleton = () => (
    <div className='space-y-3 px-3 pb-3'>
      {[...Array(10)].map((_, i) => (
        <div key={i} className='flex items-center space-x-3 py-2'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex-1 space-y-1'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
          <Skeleton className='h-6 w-16' />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (error) {
      return <p className='text-sm text-red-500 px-4 pb-4'>{error}</p>;
    }

    if (users.length === 0) {
      return <p className='text-sm text-zinc-500 px-4 pb-4'>No users yet.</p>;
    }

    return (
      <div className='space-y-1'>
        {users.map((user, index) => {
          const userAvatarSrc = user.avatarUrl && getHighResAvatar(user.avatarUrl);

          return (
            <Link
              href={`/users/${user.username}`}
              key={user.userId}
              className='flex items-center p-3 rounded-md hover:bg-zinc-800/50 transition-colors group'>
              <span className='w-6 text-center font-medium text-zinc-400 mr-3 flex-shrink-0'>
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </span>
              <Avatar className='h-10 w-10 border border-zinc-700'>
                <AvatarImage src={userAvatarSrc ?? undefined} alt={user.displayName} />
                <AvatarFallback className='text-sm bg-zinc-800'>
                  {user.displayName?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1 min-w-0 ml-3'>
                <p className='text-sm font-medium text-zinc-200 truncate group-hover:text-amber-400 transition-colors'>
                  {user.displayName}
                </p>
                <p className='text-xs text-zinc-500'>@{user.username}</p>
              </div>
              <div className='text-right flex-shrink-0 ml-2'>
                <p className='font-bold text-sm text-zinc-200'>
                  {formatLargeNumber(user.totalPoints)}
                </p>
                <p className='text-xs text-green-500 flex items-center justify-end'>
                  <TrendingUp className='h-3 w-3 mr-0.5' />
                  {formatLargeNumber(user.weeklyPoints)} this week
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-base font-medium flex items-center'>
          <Award className='h-4 w-4 mr-2 text-amber-400' />
          Top Reputation Users
        </CardTitle>
        <Button variant='ghost' size='sm' className='h-7 px-2 py-1' asChild>
          <Link href='/leaderboard?category=reputation&page=1'>
            View All
            <ChevronRight className='h-4 w-4 ml-1' />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className='flex-grow overflow-hidden pt-0'>
        {isLoading ? renderSkeleton() : renderContent()}
      </CardContent>
    </Card>
  );
};
