'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { WatchlistButton } from '@/components/tokens/WatchlistButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from '@/components/users/UserList';
import { useToast } from '@/hooks/use-toast';
import { users, watchlist } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { Token, User } from '@dyor-hub/types';
import { BookmarkIcon, Copy, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type WatchlistedToken = Token & { addedAt: Date };

const USERS_PER_PAGE = 10;

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading, user: currentUser } = useAuthContext();
  const [tokens, setTokens] = useState<WatchlistedToken[]>([]);
  const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tokens');

  useEffect(() => {
    const fetchWatchlistedTokens = async () => {
      if (activeTab !== 'tokens') return;

      setIsLoadingTokens(true);
      try {
        const data = await watchlist.getWatchlistedTokens();
        setTokens(
          data.map((token) => ({
            ...token,
            addedAt: new Date(token.addedAt),
          })),
        );
      } catch (error) {
        console.error('Error fetching watchlisted tokens:', error);
        toast({
          title: 'Error',
          description: 'Failed to load watchlisted tokens',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTokens(false);
      }
    };

    if (isAuthenticated) {
      fetchWatchlistedTokens();
    }
  }, [isAuthenticated, activeTab, toast]);

  useEffect(() => {
    const fetchFollowedUsers = async (userId: string, page: number) => {
      if (activeTab !== 'users') return;

      setIsLoadingUsers(true);
      try {
        const response = await users.getFollowing(userId, page, USERS_PER_PAGE);
        setFollowedUsers(response.data);
        setUserCurrentPage(response.meta.page);
        setUserTotalPages(response.meta.totalPages);
      } catch (error) {
        console.error('Error fetching followed users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load followed users',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (isAuthenticated && currentUser) {
      fetchFollowedUsers(currentUser.id, userCurrentPage);
    }
  }, [isAuthenticated, activeTab, toast, currentUser, userCurrentPage]);

  const handleTokenRemoved = (mintAddress: string) => {
    setTokens((prevTokens) => prevTokens.filter((token) => token.mintAddress !== mintAddress));
  };

  const handleToggleFollow = async (userId: string) => {
    const previousUsers = [...followedUsers];
    setFollowedUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      await users.unfollow(userId);
      toast({
        title: 'User unfollowed',
        description: 'You are no longer following this user.',
      });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unfollow user. Please try again.',
        variant: 'destructive',
      });
      setFollowedUsers(previousUsers);
    }
  };

  const handleUserPageChange = (page: number) => {
    if (page !== userCurrentPage && page > 0 && page <= userTotalPages) {
      setUserCurrentPage(page);
    }
  };

  const renderTokensContent = () => {
    if (isLoadingTokens || authLoading) {
      return (
        <div className='grid gap-4'>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className='h-24 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    if (tokens.length === 0) {
      return (
        <Card className='bg-zinc-900/30 border-zinc-800/50'>
          <div className='text-center py-16 px-4'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/70 mb-4'>
              <BookmarkIcon className='h-6 w-6 text-blue-400' />
            </div>
            <h3 className='text-lg font-medium text-white mb-2'>No tokens in your watchlist</h3>
            <p className='text-zinc-400 mb-6 max-w-md mx-auto'>
              Browse tokens and click the bookmark icon to add them to your watchlist for easy
              access.
            </p>
            <Button asChild variant='outline'>
              <Link href='/'>Discover Tokens</Link>
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <div className='space-y-4'>
        {tokens.map((token) => (
          <div
            key={token.mintAddress}
            className='flex items-start p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-lg hover:bg-zinc-800/30 transition-colors'>
            <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0'>
              {token.imageUrl ? (
                <Image
                  src={token.imageUrl}
                  alt={token.name}
                  width={48}
                  height={48}
                  className='object-cover'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center bg-blue-900/50 text-lg sm:text-xl font-bold text-blue-300'>
                  {token.symbol.substring(0, 1)}
                </div>
              )}
            </div>

            <div className='flex-1 min-w-0 mx-3 sm:mx-4 overflow-hidden'>
              <div className='flex items-center gap-1'>
                <Link
                  href={`/tokens/${token.mintAddress}`}
                  className='font-bold text-base sm:text-lg hover:text-blue-400 transition-colors truncate'>
                  {token.name}
                </Link>
                <span className='text-zinc-400 text-xs sm:text-sm flex items-center flex-shrink-0'>
                  <span>$</span>
                  {token.symbol}
                </span>
              </div>
              <p className='text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1 line-clamp-2 break-all'>
                {token.description || '-'}
              </p>
            </div>

            <div className='flex-shrink-0'>
              <div className='flex gap-1'>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(token.mintAddress);
                    toast({
                      title: 'Address copied',
                      description: 'Token address copied to clipboard',
                    });
                  }}
                  className='flex items-center justify-center rounded-lg p-1.5 transition-all duration-200 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 cursor-pointer'
                  title='Copy mint address'
                  aria-label='Copy mint address'>
                  <Copy className='w-5 h-5' />
                </button>
                <WatchlistButton
                  mintAddress={token.mintAddress}
                  initialWatchlistStatus={true}
                  size='sm'
                  tokenSymbol={token.symbol}
                  onStatusChange={(isWatchlisted) => {
                    if (!isWatchlisted) {
                      handleTokenRemoved(token.mintAddress);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUsersContent = () => {
    if (isLoadingUsers || authLoading) {
      return (
        <div className='space-y-4'>
          {[...Array(USERS_PER_PAGE)].map((_, i) => (
            <Skeleton key={i} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        <UserList
          users={followedUsers}
          emptyMessage='You are not following any users yet. Explore users and click the follow button.'
          followingIds={followedUsers.map((u) => u.id)}
          onToggleFollow={handleToggleFollow}
          currentUserId={currentUser?.id}
        />

        {userTotalPages > 1 && (
          <Pagination
            currentPage={userCurrentPage}
            totalPages={userTotalPages}
            onPageChange={handleUserPageChange}
          />
        )}
      </div>
    );
  };

  const watchlistContent = (
    <div className='container py-8 max-w-4xl mx-auto'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
        <h1 className='text-3xl font-bold'>Watchlist</h1>
      </div>

      <Tabs defaultValue='tokens' className='w-full' onValueChange={setActiveTab}>
        <TabsList className='grid grid-cols-2 mb-8 w-full max-w-[400px]'>
          <TabsTrigger value='tokens' className='rounded-md'>
            <BookmarkIcon className='w-4 h-4 mr-2' />
            Tokens
          </TabsTrigger>
          <TabsTrigger value='users' className='rounded-md'>
            <Users className='w-4 h-4 mr-2' />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value='tokens' className='mt-0'>
          {renderTokensContent()}
        </TabsContent>

        <TabsContent value='users' className='mt-0'>
          {renderUsersContent()}
        </TabsContent>
      </Tabs>
    </div>
  );

  return <RequireAuth>{watchlistContent}</RequireAuth>;
}
