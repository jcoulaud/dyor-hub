import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SectionCarousel } from '@/components/ui/section-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { leaderboards } from '@/lib/api';
import { formatLargeNumber, getHighResAvatar } from '@/lib/utils';
import { LeaderboardCategory, LeaderboardTimeframe, UserReputation } from '@dyor-hub/types';
import { Award, Trophy } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';

const USERS_PER_PAGE = 5;
const TOTAL_USERS_TO_FETCH = 15;

type UserCardProps = {
  user: UserReputation;
  rank: number;
};

const UserCard = memo(({ user, rank }: UserCardProps) => {
  const userAvatarSrc = user.avatarUrl ? getHighResAvatar(user.avatarUrl) : undefined;
  const isTopThree = rank <= 3;

  return (
    <Link
      href={`/users/${user.username}`}
      className='flex flex-col items-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30
        hover:border-amber-500/30 hover:bg-zinc-800/50 backdrop-blur-sm
        transition-all duration-300 group'>
      <div className='relative mb-2'>
        {/* User avatar */}
        <Avatar
          className={`h-12 w-12 border transition-all duration-300 ${
            isTopThree
              ? rank === 1
                ? 'border-yellow-500 group-hover:border-yellow-400'
                : rank === 2
                  ? 'border-gray-400 group-hover:border-gray-300'
                  : 'border-amber-700 group-hover:border-amber-600'
              : 'border-zinc-700 group-hover:border-amber-500/50'
          }`}>
          <AvatarImage src={userAvatarSrc} alt={user.displayName || user.username} />
          <AvatarFallback className='text-sm bg-zinc-800'>
            {(user.displayName || user.username)?.substring(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* User name/handle */}
      <p className='text-xs font-medium text-white truncate w-full text-center group-hover:text-amber-300 transition-colors duration-200'>
        {user.displayName || user.username}
      </p>
      <p className='text-xs text-zinc-400 truncate w-full text-center mb-1'>@{user.username}</p>

      {/* Points */}
      <div className='flex items-center gap-1 text-center mt-auto'>
        <Award className='h-3 w-3 text-amber-400' />
        <span className='text-xs font-medium text-zinc-300'>
          {formatLargeNumber(user.totalPoints || 0)}
        </span>
      </div>
    </Link>
  );
});

UserCard.displayName = 'UserCard';

export const TopReputationUsers = memo(() => {
  const [allUsers, setAllUsers] = useState<UserReputation[]>([]);
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
          TOTAL_USERS_TO_FETCH,
        );
        setAllUsers(result.users?.slice(0, TOTAL_USERS_TO_FETCH) || []);
      } catch {
        setError('Failed to load users.');
        setAllUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderSkeleton = () => (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3'>
      {Array.from({ length: USERS_PER_PAGE }).map((_, i) => (
        <div
          key={i}
          className='flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/20 animate-pulse'
          style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className='h-12 w-12 rounded-full mb-2' />
          <Skeleton className='h-3 w-16 mb-1' />
          <Skeleton className='h-2 w-10' />
        </div>
      ))}
    </div>
  );

  const paginatedData = useMemo(() => {
    const pages: UserReputation[][] = [];
    if (allUsers.length > 0) {
      for (let i = 0; i < allUsers.length; i += USERS_PER_PAGE) {
        pages.push(allUsers.slice(i, i + USERS_PER_PAGE));
      }
    }
    return pages.length > 0 ? pages : [[]];
  }, [allUsers]);

  const renderUsersGrid = (users: UserReputation[]) => {
    if (!users || users.length === 0) {
      return (
        <div className='p-4 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No users found.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3'>
        {users.map((user, index) => {
          const rank =
            index + 1 + paginatedData.findIndex((page) => page.includes(user)) * USERS_PER_PAGE;
          return <UserCard key={user.userId} user={user} rank={rank} />;
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (error) {
      return [
        <div
          key='error'
          className='px-4 py-4 text-sm text-red-500 bg-red-950/20 rounded-lg m-3 border border-red-900/50'>
          {error}
        </div>,
      ];
    }

    if (allUsers.length === 0 && !isLoading) {
      return [
        <div
          key='empty'
          className='px-4 py-4 text-sm text-zinc-400 h-full flex items-center justify-center'>
          No users found.
        </div>,
      ];
    }

    return paginatedData.map((pageData, pageIndex) => (
      <div key={`page-${pageIndex}`} className='h-full w-full'>
        {renderUsersGrid(pageData)}
      </div>
    ));
  };

  return (
    <SectionCarousel
      title='Top Contributors'
      icon={<Trophy className='h-5 w-5 text-amber-400' />}
      viewAllLink='/leaderboard?category=reputation'
      gradient='from-zinc-900/95 via-zinc-800/90 to-amber-950/10'>
      {isLoading ? [<div key='loading'>{renderSkeleton()}</div>] : renderContent()}
    </SectionCarousel>
  );
});

TopReputationUsers.displayName = 'TopReputationUsers';
