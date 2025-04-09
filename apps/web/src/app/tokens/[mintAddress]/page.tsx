'use client';

import { CommentSection } from '@/components/comments/CommentSection';
import { SolscanButton } from '@/components/SolscanButton';
import { TokenImage } from '@/components/tokens/TokenImage';
import { TokenStats } from '@/components/tokens/TokenStats';
import { WatchlistButton } from '@/components/tokens/WatchlistButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { tokens, watchlist } from '@/lib/api';
import { isValidSolanaAddress, truncateAddress } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import {
  SentimentType,
  Token,
  TokenSentimentStats,
  TokenStats as TokenStatsType,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import {
  BarChart3,
  Copy,
  Globe,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Twitter,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

const isDev = process.env.NODE_ENV === 'development';

interface PageProps {
  params: Promise<{ mintAddress: string }>;
  commentId?: string;
}

type TokenWithWatchlistStatus = Token & { isWatchlisted?: boolean };

export default function Page({ params, commentId }: PageProps) {
  const { mintAddress } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthContext();
  const commentIdFromProps =
    commentId || (pathname && pathname.includes('/comments/'))
      ? pathname?.split('/comments/')[1]?.split('/')[0]
      : undefined;
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tokenData, setTokenData] = useState<TokenWithWatchlistStatus | null>(null);
  const [tokenHistoryData, setTokenHistoryData] = useState<TwitterUsernameHistoryEntity | null>(
    null,
  );
  const [tokenStatsData, setTokenStatsData] = useState<TokenStatsType | null>(null);
  const [isHeaderLoaded, setIsHeaderLoaded] = useState(false);
  const [isStatsLoaded, setIsStatsLoaded] = useState(false);
  const [sentimentData, setSentimentData] = useState<TokenSentimentStats | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const { toast } = useToast();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const trimmedAddress = address.trim();
      if (!trimmedAddress) {
        setError('Please enter a token address');
        return;
      }

      if (!isValidSolanaAddress(trimmedAddress)) {
        setError('Please enter a valid Solana address');
        return;
      }

      setIsSearching(true);

      try {
        router.push(`/tokens/${trimmedAddress}`);
      } finally {
        setIsSearching(false);
      }
    },
    [address, router],
  );

  const handleSentimentVote = useCallback(
    async (sentimentType: SentimentType) => {
      if (!isAuthenticated) {
        toast({ title: 'Authentication Required', description: 'Please log in to vote.' });
        return;
      }

      setIsVoting(true);
      try {
        // If user already voted with this sentiment, remove it
        if (sentimentData?.userSentiment === sentimentType) {
          await tokens.removeSentiment(mintAddress);
          toast({
            title: 'Sentiment removed',
            description: 'Your sentiment has been removed.',
          });
        } else {
          await tokens.addOrUpdateSentiment(mintAddress, sentimentType);
          toast({
            title: 'Sentiment recorded',
            description: 'Your sentiment has been recorded.',
          });
        }

        const updatedData = await tokens.getTokenSentiments(mintAddress);
        setSentimentData(updatedData);
      } catch (error) {
        console.error('Error updating sentiment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update sentiment.';
        toast({
          title: 'Error',
          description: `${errorMessage} Please try again.`,
          variant: 'destructive',
        });
      } finally {
        setIsVoting(false);
      }
    },
    [isAuthenticated, mintAddress, sentimentData, toast],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (tokenData && mintAddress === tokenData.mintAddress) {
          return;
        }

        if (!isValidSolanaAddress(mintAddress)) {
          notFound();
        }

        try {
          const token = await tokens.getByMintAddress(mintAddress);

          if (isAuthenticated) {
            try {
              const isWatchlisted = await watchlist.isTokenWatchlisted(mintAddress);
              token.isWatchlisted = isWatchlisted;
            } catch {
              token.isWatchlisted = false;
            }
          } else {
            token.isWatchlisted = false;
          }

          setTokenData(token);
          setIsHeaderLoaded(true);

          if (token.imageUrl && token.imageUrl.includes('cf-ipfs.com/ipfs/')) {
            token.imageUrl = token.imageUrl.replace('cf-ipfs.com/ipfs/', 'ipfs.io/ipfs/');
          }
        } catch (error) {
          console.error('Error fetching token data:', error);
          notFound();
          return;
        }

        if (isDev) {
          setIsStatsLoaded(true);
          return;
        }

        try {
          const [tokenStats, twitterHistory] = await Promise.allSettled([
            tokens.getTokenStats(mintAddress),
            tokens.getTwitterHistory(mintAddress),
          ]);

          if (tokenStats.status === 'fulfilled') {
            setTokenStatsData(tokenStats.value);
          } else {
            console.error('Error fetching token stats:', tokenStats.reason);
          }

          if (twitterHistory.status === 'fulfilled') {
            setTokenHistoryData(twitterHistory.value);
          } else {
            console.error('Error fetching token twitter history:', twitterHistory.reason);
          }
        } catch (error) {
          console.error('Error fetching token stats or history:', error);
        } finally {
          setIsStatsLoaded(true);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setIsHeaderLoaded(true);
        setIsStatsLoaded(true);
      }
    };

    setIsHeaderLoaded(false);
    setIsStatsLoaded(false);
    fetchData();
  }, [mintAddress]);

  useEffect(() => {
    const fetchSentimentData = async () => {
      try {
        if (tokenData && mintAddress === tokenData.mintAddress) {
          const data = await tokens.getTokenSentiments(mintAddress);
          setSentimentData(data);
        }
      } catch (error) {
        console.error('Error fetching sentiment data:', error);
      }
    };

    fetchSentimentData();
  }, [mintAddress, tokenData]);

  return (
    <div className='flex-1 flex flex-col'>
      {/* Page Background */}
      <div className='fixed inset-0 bg-gradient-to-br from-blue-950/30 to-purple-950/30 z-0' />
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />

      {/* Animated gradient orbs */}
      <div className='fixed top-20 left-1/4 w-72 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse z-0' />
      <div
        className='fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse z-0'
        style={{ animationDelay: '1s' }}
      />

      <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Search Token Card - Mobile only */}
        <div className='xl:hidden relative group mb-6'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
          <div className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-br from-green-600/5 to-green-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
            <div className='relative py-3 px-3'>
              <form onSubmit={handleSubmit} className='space-y-3'>
                <div className='flex flex-col gap-3'>
                  <div className='relative flex-grow'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <Search className='h-5 w-5 text-zinc-500' />
                    </div>
                    <Input
                      type='text'
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setError('');
                      }}
                      placeholder='Enter token contract address'
                      className='h-10 pl-10 w-full border-zinc-800/50 bg-zinc-900/30 text-sm placeholder:text-zinc-500 rounded-lg'
                    />
                  </div>
                  <button
                    type='submit'
                    className={`h-10 bg-gradient-to-r from-blue-500 to-blue-600 px-4 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center ${
                      isSearching
                        ? 'opacity-90 cursor-not-allowed'
                        : 'hover:brightness-110 hover:shadow-xl hover:shadow-blue-500/30 cursor-pointer'
                    }`}
                    disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {error && <p className='text-sm text-red-500'>{error}</p>}
              </form>
            </div>
          </div>
        </div>

        {/* Token Header Card */}
        <div className='relative group mb-6'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300'></div>
          <Card className='relative w-full border-0 bg-black/60 backdrop-blur-md shadow-xl rounded-xl overflow-hidden'>
            <CardContent className='p-4'>
              {!isHeaderLoaded ? (
                <div className='flex items-start gap-4'>
                  <Skeleton className='w-16 h-16 rounded-full' />
                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-col gap-2'>
                      <div className='flex justify-between items-center flex-wrap'>
                        <Skeleton className='w-48 h-8' />
                      </div>
                      <Skeleton className='w-full h-16' />
                    </div>
                  </div>
                </div>
              ) : tokenData ? (
                <div className='flex items-start gap-4'>
                  <div className='flex flex-col items-center'>
                    <TokenImage
                      imageUrl={tokenData.imageUrl}
                      name={tokenData.name}
                      symbol={tokenData.symbol}
                      className='w-16 h-16 rounded-full'
                    />
                    <div className='sm:hidden mt-2'>
                      <WatchlistButton
                        mintAddress={tokenData.mintAddress}
                        initialWatchlistStatus={tokenData.isWatchlisted}
                        onStatusChange={(isWatchlisted) => {
                          setTokenData((prev) => (prev ? { ...prev, isWatchlisted } : null));
                        }}
                        size='sm'
                        tokenSymbol={tokenData.symbol}
                      />
                    </div>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-col gap-2'>
                      <div className='flex justify-between items-center flex-wrap'>
                        <div className='flex flex-col sm:flex-row sm:items-center sm:gap-2'>
                          <h1 className='text-2xl font-bold text-white'>{tokenData.name}</h1>
                          <div className='flex items-center sm:hidden'>
                            <span className='text-lg text-zinc-400 font-medium'>$</span>
                            <span className='text-lg text-zinc-400 font-medium'>
                              {tokenData.symbol}
                            </span>
                          </div>
                          <div className='hidden sm:flex sm:items-center'>
                            <span className='text-lg text-zinc-400 font-medium'>$</span>
                            <span className='text-lg text-zinc-400 font-medium'>
                              {tokenData.symbol}
                            </span>
                            <div className='ml-3'>
                              <WatchlistButton
                                mintAddress={tokenData.mintAddress}
                                initialWatchlistStatus={tokenData.isWatchlisted}
                                onStatusChange={(isWatchlisted) => {
                                  setTokenData((prev) =>
                                    prev ? { ...prev, isWatchlisted } : null,
                                  );
                                }}
                                size='sm'
                                tokenSymbol={tokenData.symbol}
                              />
                            </div>
                          </div>
                        </div>
                        <div className='hidden sm:flex items-center gap-2 flex-shrink-0'>
                          <SolscanButton
                            address={tokenData.mintAddress}
                            type='token'
                            className='relative flex items-center gap-1 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 h-8 px-2 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'>
                            <span className='font-mono text-zinc-200 text-xs'>
                              {truncateAddress(tokenData.mintAddress)}
                            </span>
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              className='text-blue-400 transition-colors'>
                              <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
                              <polyline points='15 3 21 3 21 9' />
                              <line x1='10' y1='14' x2='21' y2='3' />
                            </svg>
                          </SolscanButton>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(tokenData.mintAddress);
                              toast({
                                title: 'Address copied',
                                description: 'Token address copied to clipboard',
                              });
                            }}
                            className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'
                            title='Copy address'>
                            <Copy className='w-4 h-4 text-blue-400' />
                          </button>

                          {/* Desktop Social buttons */}
                          {tokenData.websiteUrl && (
                            <Link
                              href={tokenData.websiteUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                              title='Website'>
                              <Globe className='w-4 h-4 text-blue-400' />
                            </Link>
                          )}

                          {tokenData.twitterHandle && (
                            <Link
                              href={`https://twitter.com/${tokenData.twitterHandle}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                              title='Twitter'>
                              <Twitter
                                className={`w-4 h-4 ${tokenHistoryData?.history && tokenHistoryData.history.length > 0 ? 'text-red-400' : 'text-blue-400'}`}
                              />
                            </Link>
                          )}

                          {tokenData.telegramUrl && (
                            <Link
                              href={tokenData.telegramUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                              title='Telegram'>
                              <MessageSquare className='w-4 h-4 text-blue-400' />
                            </Link>
                          )}
                        </div>
                      </div>
                      <p className='text-zinc-400 max-w-full md:max-w-[75%] text-sm'>
                        {tokenData.description}
                      </p>

                      {/* Mobile Social Buttons */}
                      <div className='flex sm:hidden items-center gap-2 mt-3'>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tokenData.mintAddress);
                            toast({
                              title: 'Address copied',
                              description: 'Token address copied to clipboard',
                            });
                          }}
                          className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'
                          title='Copy address'>
                          <Copy className='w-4 h-4 text-blue-400' />
                        </button>

                        {tokenData.websiteUrl && (
                          <Link
                            href={tokenData.websiteUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                            title='Website'>
                            <Globe className='w-4 h-4 text-blue-400' />
                          </Link>
                        )}

                        {tokenData.twitterHandle && (
                          <Link
                            href={`https://twitter.com/${tokenData.twitterHandle}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                            title='Twitter'>
                            <Twitter
                              className={`w-4 h-4 ${tokenHistoryData?.history && tokenHistoryData.history.length > 0 ? 'text-red-400' : 'text-blue-400'}`}
                            />
                          </Link>
                        )}

                        {tokenData.telegramUrl && (
                          <Link
                            href={tokenData.telegramUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                            title='Telegram'>
                            <MessageSquare className='w-4 h-4 text-blue-400' />
                          </Link>
                        )}

                        <SolscanButton
                          address={tokenData.mintAddress}
                          type='token'
                          className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='text-blue-400 transition-colors'>
                            <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
                            <polyline points='15 3 21 3 21 9' />
                            <line x1='10' y1='14' x2='21' y2='3' />
                          </svg>
                        </SolscanButton>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-center p-8'>
                  <h2 className='text-xl font-semibold text-red-500 mb-2'>Token not found</h2>
                  <p className='text-zinc-400'>
                    The token you&apos;re looking for could not be found.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main three-column layout */}
        <div className='grid grid-cols-1 xxs:grid-cols-6 xs:grid-cols-6 sm:grid-cols-6 xl:grid-cols-12 gap-4 sm:gap-6 xl:gap-8'>
          {/* Left column - Token data */}
          <div className='col-span-1 xxs:col-span-2 xs:col-span-2 sm:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6 xl:space-y-8 order-1 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center mb-4'>
                    {!isHeaderLoaded ? (
                      <>
                        <Skeleton className='h-10 w-10 rounded-xl mr-4' />
                        <Skeleton className='h-6 w-48' />
                      </>
                    ) : (
                      <>
                        <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors duration-300'>
                          <Sparkles className='h-5 w-5 text-blue-400' />
                        </div>
                        <CardTitle className='text-xl font-semibold text-white'>
                          Token Information
                        </CardTitle>
                      </>
                    )}
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-blue-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  {!isStatsLoaded ? (
                    <div className='space-y-6'>
                      <div className='space-y-3'>
                        <Skeleton className='h-5 w-24' />
                        <div className='space-y-2'>
                          <Skeleton className='h-6 w-full' />
                          <Skeleton className='h-6 w-full' />
                          <Skeleton className='h-6 w-full' />
                        </div>
                      </div>

                      {/* Price chart skeleton */}
                      <div className='w-full h-[120px] bg-zinc-900 rounded-xl'>
                        <div className='h-full w-full flex items-center justify-center'>
                          <div className='w-full h-[80px] bg-zinc-800/50 animate-pulse rounded-lg'></div>
                        </div>
                      </div>

                      {/* Supply info skeleton */}
                      <div className='space-y-3'>
                        <Skeleton className='h-5 w-36' />
                        <div className='space-y-2'>
                          <Skeleton className='h-6 w-full' />
                          <Skeleton className='h-6 w-full' />
                        </div>
                      </div>

                      {/* Top holders skeleton */}
                      <div className='space-y-3'>
                        <Skeleton className='h-5 w-28' />
                        <div className='space-y-2'>
                          <Skeleton className='h-4 w-full' />
                          <Skeleton className='h-4 w-full' />
                          <Skeleton className='h-4 w-full' />
                          <Skeleton className='h-4 w-full' />
                        </div>
                      </div>
                    </div>
                  ) : tokenData && tokenStatsData ? (
                    <TokenStats
                      stats={tokenStatsData}
                      tokenMintAddress={tokenData.mintAddress}
                      twitterHistory={tokenHistoryData}
                    />
                  ) : (
                    <div className='space-y-4 text-zinc-300'>
                      <div className='flex items-center justify-center py-8'>
                        <div className='inline-flex items-center px-4 py-2 rounded-full bg-red-950/20 backdrop-blur-sm border border-red-500/10'>
                          <Shield className='h-4 w-4 text-red-400 mr-2' />
                          <span className='text-sm font-medium text-zinc-200'>
                            {isDev
                              ? 'Token data disabled in development mode to save on API calls'
                              : 'Unable to load token data. Please refresh or try again later.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middle column - Comments */}
          <div className='col-span-1 xxs:col-span-4 xs:col-span-4 sm:col-span-4 xl:col-span-6 space-y-4 sm:space-y-6 xl:space-y-8 order-3 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center'>
                    <div className='h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4 group-hover:bg-purple-500/20 transition-colors duration-300'>
                      <MessageSquare className='h-5 w-5 text-purple-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>
                      Community Discussion
                    </CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-purple-500/20 to-transparent mt-3'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  <CommentSection tokenMintAddress={mintAddress} commentId={commentIdFromProps} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - Desktop search */}
          <div className='hidden xl:block col-span-1 xxs:col-span-2 xs:col-span-2 sm:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6 xl:space-y-8 order-2 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-green-600/5 to-green-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center'>
                    <div className='h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center mr-4 group-hover:bg-green-500/20 transition-colors duration-300'>
                      <Search className='h-5 w-5 text-green-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>Search Token</CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-green-500/20 to-transparent mt-3'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  <form onSubmit={handleSubmit} className='space-y-3'>
                    <div className='flex flex-col gap-3'>
                      <div className='relative flex-grow'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <Search className='h-5 w-5 text-zinc-500' />
                        </div>
                        <Input
                          type='text'
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            setError('');
                          }}
                          placeholder='Enter token contract address'
                          className='h-10 pl-10 w-full border-zinc-800/50 bg-zinc-900/30 text-sm placeholder:text-zinc-500 rounded-lg'
                        />
                      </div>
                      <button
                        type='submit'
                        className={`h-10 bg-gradient-to-r from-blue-500 to-blue-600 px-4 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center ${
                          isSearching
                            ? 'opacity-90 cursor-not-allowed'
                            : 'hover:brightness-110 hover:shadow-xl hover:shadow-blue-500/30 cursor-pointer'
                        }`}
                        disabled={isSearching}>
                        {isSearching ? 'Searching...' : 'Find Token'}
                      </button>
                    </div>
                    {error && <p className='text-xs font-medium text-red-500'>{error}</p>}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Community Sentiment */}
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center mb-4'>
                    <div className='h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors duration-300'>
                      <BarChart3 className='h-5 w-5 text-blue-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>
                      Token Sentiment
                    </CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-blue-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='pt-2 pb-6'>
                  {tokenData && (
                    <div className='grid grid-cols-3 gap-2'>
                      {/* Bullish Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-900/60 rounded-lg p-3 border ${
                          sentimentData?.userSentiment === SentimentType.BULLISH
                            ? 'border-green-500/50 bg-green-900/20'
                            : 'border-transparent hover:border-green-500/20 hover:bg-green-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => handleSentimentVote(SentimentType.BULLISH)}>
                        <div className='text-2xl mb-2'>🚀</div>
                        <div className='font-bold text-xl text-white'>
                          {sentimentData?.bullishCount || 0}
                        </div>
                      </div>

                      {/* Bearish Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-900/60 rounded-lg p-3 border ${
                          sentimentData?.userSentiment === SentimentType.BEARISH
                            ? 'border-red-500/50 bg-red-900/20'
                            : 'border-transparent hover:border-red-500/20 hover:bg-red-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => handleSentimentVote(SentimentType.BEARISH)}>
                        <div className='text-2xl mb-2'>💩</div>
                        <div className='font-bold text-xl text-white'>
                          {sentimentData?.bearishCount || 0}
                        </div>
                      </div>

                      {/* Red Flag Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-900/60 rounded-lg p-3 border ${
                          sentimentData?.userSentiment === SentimentType.RED_FLAG
                            ? 'border-orange-500/50 bg-orange-900/20'
                            : 'border-transparent hover:border-yellow-500/20 hover:bg-yellow-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => handleSentimentVote(SentimentType.RED_FLAG)}>
                        <div className='text-2xl mb-2'>🚩</div>
                        <div className='font-bold text-xl text-white'>
                          {sentimentData?.redFlagCount || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
