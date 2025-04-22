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
import { ApiError, feed, users, watchlist } from '@/lib/api';
import { MIN_TOKEN_HOLDING_FOR_FEED } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { Token, User, UserActivity } from '@dyor-hub/types';
import { AlertCircle, BookmarkIcon, Copy, Lock, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type WatchlistedToken = Token & { addedAt: Date };

const USERS_PER_PAGE = 10;

interface FeedContentProps {
  activities: UserActivity[];
}

function FeedContent({ activities }: FeedContentProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card className='bg-zinc-900/30 border-zinc-800/50 p-6 text-center'>
        <p className='text-zinc-400'>No activity in your feed yet.</p>
      </Card>
    );
  }

  return (
    <Card className='bg-zinc-900/30 border-zinc-800/50 p-6'>
      <h3 className='text-lg font-medium text-white mb-4'>Activity Feed</h3>
      <div className='space-y-4'>
        {activities.map((activity, index) => (
          <div key={index} className='p-3 bg-zinc-800/50 rounded'>
            <pre className='text-xs text-zinc-300 overflow-auto'>
              {JSON.stringify(activity, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface TokenGatedMessageProps {
  requiredAmount: number;
  currentBalance?: string | number | null;
}

function TokenGatedMessage({ requiredAmount, currentBalance }: TokenGatedMessageProps) {
  const formattedRequired = requiredAmount.toLocaleString();
  const formattedBalance =
    typeof currentBalance === 'string' || typeof currentBalance === 'number'
      ? Number(currentBalance).toLocaleString()
      : null;

  return (
    <Card className='bg-zinc-900/30 border-zinc-800/50'>
      <div className='text-center py-16 px-4'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/70 mb-4'>
          <Lock className='h-6 w-6 text-yellow-400' />
        </div>
        <h3 className='text-lg font-medium text-white mb-2'>Feed Access Restricted</h3>
        <p className='text-zinc-400 mb-6 max-w-md mx-auto'>
          Access to this feed requires holding a minimum of{` `}
          <span className='font-bold text-white'>{formattedRequired}</span> $DYORHUB tokens.
          {formattedBalance !== null && (
            <>
              {` `}Your current balance is{` `}
              <span className='font-bold text-white'>{formattedBalance}</span>.
            </>
          )}
          {` `}Please ensure your primary connected wallet meets this requirement.
        </p>
        <Button asChild variant='outline'>
          <Link href='/account/wallet'>Manage Wallet</Link>
        </Button>
      </div>
    </Card>
  );
}

function FeedErrorMessage() {
  return (
    <Card className='bg-red-900/20 border-red-500/30'>
      <div className='text-center py-16 px-4'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-800/70 mb-4'>
          <AlertCircle className='h-6 w-6 text-red-300' />
        </div>
        <h3 className='text-lg font-medium text-white mb-2'>Error Loading Feed</h3>
        <p className='text-red-300 mb-6 max-w-md mx-auto'>
          There was an issue loading the feed. Please try again later.
        </p>
      </div>
    </Card>
  );
}

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading, user: currentUser } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['tokens', 'users', 'feed'].includes(tabParam)) {
      return tabParam as 'tokens' | 'users' | 'feed';
    }
    return 'tokens';
  }, [searchParams]);

  const [tokens, setTokens] = useState<WatchlistedToken[]>([]);
  const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const { toast } = useToast();

  const [feedData, setFeedData] = useState<UserActivity[] | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<'forbidden' | 'generic' | null>(null);
  const [feedCurrentPage, setFeedCurrentPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedAccessDeniedBalance, setFeedAccessDeniedBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchWatchlistedTokens = async () => {
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

    if (isAuthenticated && currentTab === 'tokens') {
      fetchWatchlistedTokens();
    }
    if (currentTab !== 'tokens') {
      setTokens([]);
      setIsLoadingTokens(true);
    }
  }, [isAuthenticated, currentTab, toast]);

  useEffect(() => {
    const fetchFollowedUsers = async (userId: string, page: number) => {
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

    if (isAuthenticated && currentUser && currentTab === 'users') {
      fetchFollowedUsers(currentUser.id, userCurrentPage);
    }
    if (currentTab !== 'users') {
      setFollowedUsers([]);
      setIsLoadingUsers(true);
      setUserCurrentPage(1);
      setUserTotalPages(1);
    }
  }, [isAuthenticated, currentTab, toast, currentUser, userCurrentPage]);

  useEffect(() => {
    const fetchFeed = async (page: number) => {
      if (!isAuthenticated) return;

      setIsLoadingFeed(true);
      setFeedError(null);
      setFeedAccessDeniedBalance(null);
      try {
        const response = await feed.getFollowing(page, 10);
        setFeedData(response.data);
        setFeedCurrentPage(response.meta.page);
        setFeedTotalPages(response.meta.totalPages);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          setFeedError('forbidden');
          let balanceFromError = null;
          if (typeof error.data === 'object' && error.data && 'currentBalance' in error.data) {
            balanceFromError = String(error.data.currentBalance);
          }
          setFeedAccessDeniedBalance(balanceFromError);
        } else {
          setFeedError('generic');
        }
        setFeedData(null);
      } finally {
        setIsLoadingFeed(false);
      }
    };

    if (isAuthenticated && currentTab === 'feed') {
      fetchFeed(feedCurrentPage);
    }
    if (currentTab !== 'feed') {
      setFeedData(null);
      setFeedError(null);
      setIsLoadingFeed(false);
      setFeedCurrentPage(1);
      setFeedTotalPages(1);
      setFeedAccessDeniedBalance(null);
    }
  }, [currentTab, isAuthenticated, feedCurrentPage]);

  const handleTokenRemoved = (mintAddress: string) => {
    setTokens((prevTokens) => prevTokens.filter((token) => token.mintAddress !== mintAddress));
  };

  const handleToggleFollow = async (userId: string) => {
    const isFollowing = followedUsers.some((u) => u.id === userId);
    const previousUsers = [...followedUsers];

    if (isFollowing) {
      setFollowedUsers((prev) => prev.filter((u) => u.id !== userId));
    }

    try {
      if (isFollowing) {
        await users.unfollow(userId);
        toast({
          title: 'User unfollowed',
          description: 'You are no longer following this user.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`,
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

  const handleFeedPageChange = (page: number) => {
    if (page !== feedCurrentPage && page > 0 && page <= feedTotalPages) {
      setFeedCurrentPage(page);
    }
  };

  const handleTabChange = (newTab: string) => {
    if (['tokens', 'users', 'feed'].includes(newTab) && newTab !== currentTab) {
      const params = new URLSearchParams(searchParams);
      params.set('tab', newTab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
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

  const renderFeedContent = () => {
    if (isLoadingFeed || authLoading) {
      return (
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      );
    }

    if (feedError === 'forbidden') {
      return (
        <TokenGatedMessage
          requiredAmount={MIN_TOKEN_HOLDING_FOR_FEED}
          currentBalance={feedAccessDeniedBalance}
        />
      );
    }

    if (feedError === 'generic') {
      return <FeedErrorMessage />;
    }

    return (
      <div className='space-y-6'>
        <FeedContent activities={feedData || []} />
        {feedTotalPages > 1 && (
          <Pagination
            currentPage={feedCurrentPage}
            totalPages={feedTotalPages}
            onPageChange={handleFeedPageChange}
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

      <Tabs value={currentTab} className='w-full' onValueChange={handleTabChange}>
        <TabsList className='grid grid-cols-3 mb-8 w-full max-w-[500px]'>
          <TabsTrigger value='tokens' className='rounded-md'>
            <BookmarkIcon className='w-4 h-4 mr-2' />
            Tokens
          </TabsTrigger>
          <TabsTrigger value='users' className='rounded-md'>
            <Users className='w-4 h-4 mr-2' />
            Users
          </TabsTrigger>
          <TabsTrigger value='feed' className='rounded-md'>
            <Lock className='w-4 h-4 mr-2' />
            Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value='tokens' className='mt-0'>
          {renderTokensContent()}
        </TabsContent>

        <TabsContent value='users' className='mt-0'>
          {renderUsersContent()}
        </TabsContent>

        <TabsContent value='feed' className='mt-0'>
          {renderFeedContent()}
        </TabsContent>
      </Tabs>
    </div>
  );

  return <RequireAuth>{watchlistContent}</RequireAuth>;
}
