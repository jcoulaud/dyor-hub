'use client';

import { Pagination } from '@/components/ui/pagination';
import { UserList } from '@/components/users/UserList';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import type { User } from '@dyor-hub/types';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function FollowersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user: currentUser } = useAuthContext();

  const username = params.username as string;
  const pageParam = searchParams.get('page');
  const pageNum = Number(pageParam) || 1;
  const limit = 20;

  const [user, setUser] = useState<User | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userData = await users.getByUsername(username);
        setUser(userData);
        const followersData = await users.getFollowers(userData.id, pageNum, limit);
        setFollowers(followersData.data);
        setMeta(followersData.meta);
        if (isAuthenticated && currentUser?.id) {
          try {
            const currentUserFollowing = await users.getFollowing(currentUser.id, 1, 100);
            setFollowingIds(currentUserFollowing.data.map((user: User) => user.id));
          } catch (error) {
            console.error('Error fetching current user following:', error);
          }
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load followers data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, pageNum, isAuthenticated, currentUser]);

  const handlePageChange = (page: number) => {
    router.push(`/users/${username}/followers?page=${page}`);
  };

  const handleToggleFollow = async (userId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to follow users',
        variant: 'destructive',
      });
      return;
    }

    try {
      const isCurrentlyFollowing = followingIds.includes(userId);

      if (isCurrentlyFollowing) {
        setFollowingIds((prev) => prev.filter((id) => id !== userId));
      } else {
        setFollowingIds((prev) => [...prev, userId]);
      }

      if (isCurrentlyFollowing) {
        await users.unfollow(userId);
        toast({
          title: 'Unfollowed',
          description: 'User has been removed from your following list',
        });
      } else {
        await users.follow(userId);
        toast({
          title: 'Following',
          description: 'User has been added to your following list',
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className='container max-w-4xl mx-auto py-8 px-4 sm:px-6'>
        <div className='h-8 w-40 bg-zinc-800/50 animate-pulse rounded mb-8'></div>
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='h-20 bg-zinc-800/50 animate-pulse rounded'></div>
          ))}
        </div>
      </div>
    );
  }

  const emptyState = followers.length === 0 && (
    <div className='text-center py-16 px-4 bg-zinc-900/30 border-zinc-800/50 rounded-xl'>
      <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/70 mb-4'>
        <Users className='h-6 w-6 text-blue-400' />
      </div>
      <h3 className='text-lg font-medium text-white mb-2'>No users found</h3>
      <p className='text-zinc-400 mb-4 max-w-md mx-auto'>
        {user.displayName} doesn&apos;t have any followers yet.
      </p>
    </div>
  );

  return (
    <div className='container max-w-4xl mx-auto py-8 px-4 sm:px-6'>
      <div className='flex items-center mb-8'>
        <Link
          href={`/users/${username}`}
          className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors mr-4'>
          <ArrowLeft size={20} className='text-zinc-400' />
          <span className='sr-only'>Back to profile</span>
        </Link>
        <h1 className='text-3xl font-bold'>Followers</h1>
      </div>

      <div className='space-y-6'>
        {followers.length === 0 ? (
          emptyState
        ) : (
          <UserList
            users={followers}
            emptyMessage={`${user.displayName} doesn't have any followers yet.`}
            followingIds={followingIds}
            onToggleFollow={handleToggleFollow}
            currentUserId={currentUser?.id}
          />
        )}

        {followers.length > 0 && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
