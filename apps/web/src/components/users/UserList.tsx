import { getHighResAvatar } from '@/lib/utils';
import { User } from '@dyor-hub/types';
import { UserMinus, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FollowNotificationSettings } from '../user/FollowNotificationSettings';

interface UserCardProps {
  user: User;
  isFollowing: boolean;
  onToggleFollow: (userId: string) => void;
  currentUserId?: string;
}

export function UserCard({ user, isFollowing, onToggleFollow, currentUserId }: UserCardProps) {
  const highResAvatar = getHighResAvatar(user.avatarUrl);
  const isCurrentUser = currentUserId === user.id;
  const profileUrl = `/users/${user.username}`;

  return (
    <div className='flex items-start p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-lg hover:bg-zinc-800/30 transition-colors'>
      <Link
        href={profileUrl}
        className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 transition-transform hover:scale-105'>
        {highResAvatar ? (
          <Image
            src={highResAvatar}
            alt={user.displayName}
            width={48}
            height={48}
            className='object-cover w-full h-full'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center bg-blue-900/50 text-lg sm:text-xl font-bold text-blue-300'>
            {user.username.substring(0, 1).toUpperCase()}
          </div>
        )}
      </Link>

      <div className='flex-1 min-w-0 mx-3 sm:mx-4 overflow-hidden flex flex-col'>
        <Link
          href={profileUrl}
          className='font-bold text-base sm:text-lg hover:text-blue-400 transition-colors truncate'>
          {user.displayName}
        </Link>
        <Link
          href={profileUrl}
          className='text-zinc-400 text-xs sm:text-sm truncate hover:text-zinc-300 transition-colors'>
          @{user.username}
        </Link>
      </div>

      <div className='flex-shrink-0 self-center flex items-center gap-2'>
        {isFollowing && !isCurrentUser && <FollowNotificationSettings followedId={user.id} />}

        {!isCurrentUser && (
          <button
            onClick={() => onToggleFollow(user.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 text-sm font-medium cursor-pointer ${
              isFollowing
                ? 'bg-zinc-800/80 hover:bg-zinc-700/90 text-rose-400 hover:text-rose-300'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white hover:text-white'
            }`}
            title={isFollowing ? 'Unfollow' : 'Follow'}
            aria-label={isFollowing ? 'Unfollow' : 'Follow'}>
            {isFollowing ? (
              <>
                <UserMinus className='w-4 h-4' />
                <span>Unfollow</span>
              </>
            ) : (
              <>
                <UserPlus className='w-4 h-4' />
                <span>Follow</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface UserListProps {
  users: User[];
  emptyMessage: string;
  followingIds: string[];
  onToggleFollow: (userId: string) => void;
  currentUserId?: string;
}

export function UserList({
  users,
  emptyMessage,
  followingIds,
  onToggleFollow,
  currentUserId,
}: UserListProps) {
  if (users.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-xl border border-zinc-800/60'>
        <div className='text-zinc-400 text-center'>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          isFollowing={followingIds.includes(user.id)}
          onToggleFollow={onToggleFollow}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
