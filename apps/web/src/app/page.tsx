'use client';

import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { LatestComments } from '@/components/home/LatestComments';
import { TokenList } from '@/components/tokens/TokenList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { tokens } from '@/lib/api';
import { Token } from '@dyor-hub/types';
import {
  MessageSquare,
  Newspaper,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const data = await tokens.list();
      setTokenList(data);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

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

  const handleOpenFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(true);
  }, []);

  const handleCloseFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(false);
  }, []);

  const memoizedTokenList = useMemo(() => tokenList, [tokenList]);

  return (
    <main className='flex-1 flex flex-col'>
      {/* Hero Section */}
      <section className='relative w-full py-16 md:py-20 overflow-hidden'>
        {/* Background elements */}
        <div className='absolute inset-0 bg-gradient-to-br from-blue-950/30 to-purple-950/30 z-0' />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />

        {/* Animated gradient orbs */}
        <div className='absolute top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse' />
        <div
          className='absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        />

        <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col items-center text-center max-w-3xl mx-auto space-y-8'>
            <div className='space-y-5'>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10'>
                <Sparkles className='h-4 w-4 text-blue-400 mr-2' />
                <span className='text-sm font-medium text-zinc-300'>Beta</span>
                <span className='mx-2 text-sm text-zinc-300/70'>•</span>
                <button
                  className='text-sm font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer'
                  type='button'
                  onClick={handleOpenFeedbackModal}
                  aria-label='Open feedback form'>
                  Give Feedback
                </button>
              </div>

              <h1 className='text-5xl md:text-7xl font-bold tracking-tight'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500'>
                  DYOR hub
                </span>
              </h1>

              <p className='text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto leading-relaxed'>
                Your trusted platform for Solana memecoin discussions and research
              </p>
            </div>

            <Card className='w-full max-w-2xl border border-white/5 bg-black/40 backdrop-blur-md shadow-xl'>
              <CardContent className='pt-6 pb-6'>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='flex flex-col sm:flex-row gap-3'>
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
                        className='h-12 pl-10 w-full border-zinc-800/50 bg-zinc-900/30 text-base placeholder:text-zinc-500 rounded-lg'
                      />
                    </div>
                    <button
                      type='submit'
                      className={`h-12 bg-gradient-to-r from-blue-500 to-purple-500 px-6 text-base font-medium text-white rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center min-w-[120px] ${
                        isSearching
                          ? 'opacity-90 cursor-not-allowed'
                          : 'hover:brightness-110 hover:shadow-xl hover:shadow-blue-500/30 cursor-pointer'
                      }`}
                      disabled={isSearching}
                      aria-label={isSearching ? 'Searching...' : 'Find Token'}>
                      {isSearching ? (
                        <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white'></div>
                      ) : (
                        'Find Token'
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className='text-sm font-medium text-red-500' role='alert'>
                      {error}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            <div className='flex flex-col sm:flex-row items-center justify-center sm:space-x-4 space-y-3 sm:space-y-0 text-sm text-zinc-500'>
              <div className='flex items-center'>
                <Shield className='h-4 w-4 mr-1 text-green-500' />
                <span>Real Twitter Users Discussions</span>
              </div>
              <div className='h-1 w-1 rounded-full bg-zinc-700 hidden sm:block' />
              <div className='flex items-center'>
                <TrendingUp className='h-4 w-4 mr-1 text-blue-500' />
                <span>Real-time News</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token List Section */}
      <section className='relative'>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />
        <div className='absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl' />
        <div className='absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl' />

        <div className='relative z-10'>
          {isLoading ? (
            <div className='w-full overflow-x-hidden -mt-8 mb-12'>
              <div className='flex justify-center'>
                <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10'>
                  <Sparkles className='h-4 w-4 text-blue-400 mr-2 animate-pulse' />
                  <span className='text-sm font-medium text-zinc-300'>Loading tokens...</span>
                </div>
              </div>
            </div>
          ) : memoizedTokenList.length > 0 ? (
            <TokenList tokens={memoizedTokenList} />
          ) : (
            <div className='w-full overflow-x-hidden -mt-8 mb-12'>
              <div className='flex justify-center'>
                <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10'>
                  <Sparkles className='h-4 w-4 text-blue-400 mr-2' />
                  <span className='text-sm font-medium text-zinc-300'>No tokens found</span>
                </div>
              </div>
            </div>
          )}

          {/* Inline Latest Comments */}
          <div className='container mx-auto mt-24 mb-12 px-4 sm:px-6 lg:px-8 max-w-lg'>
            <div className='mb-5 flex items-center justify-center'>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10'>
                <MessageSquare className='h-4 w-4 text-blue-400 mr-2' />
                <span className='text-sm font-medium text-zinc-300'>Latest Comments</span>
              </div>
            </div>
            <LatestComments limit={5} rotationSpeed={4500} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-12 relative overflow-hidden flex-grow'>
        {/* Background elements */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />
        <div className='absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl' />

        <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10'>
            {/* Feature 1 */}
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-4 relative'>
                  <div className='flex items-center mb-4'>
                    <div className='h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors duration-300'>
                      <Users className='h-6 w-6 text-blue-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>Discuss</CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-blue-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='relative pt-4'>
                  <CardDescription className='text-zinc-300 text-base'>
                    Join conversations about memecoins with Twitter-verified users and build a
                    trusted network of reliable sources.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Feature 2 */}
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-4 relative'>
                  <div className='flex items-center mb-4'>
                    <div className='h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4 group-hover:bg-purple-500/20 transition-colors duration-300'>
                      <Newspaper className='h-6 w-6 text-purple-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>Get Updates</CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-purple-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='relative pt-4'>
                  <CardDescription className='text-zinc-300 text-base'>
                    Find memecoin news and updates from verified sources with real-time
                    notifications and alerts about important developments.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Feature 3 */}
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-green-600/5 to-green-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-4 relative'>
                  <div className='flex items-center mb-4'>
                    <div className='h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mr-4 group-hover:bg-green-500/20 transition-colors duration-300'>
                      <MessageSquare className='h-6 w-6 text-green-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>
                      Share Knowledge
                    </CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-green-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='relative pt-4'>
                  <CardDescription className='text-zinc-300 text-base'>
                    Help others avoid scams by sharing your memecoin research and due diligence with
                    the community of verified users.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={handleCloseFeedbackModal} />
    </main>
  );
}
