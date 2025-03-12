'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, Newspaper, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
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

    router.push(`/tokens/${trimmedAddress}`);
  };

  return (
    <div className='flex flex-col'>
      {/* Hero Section */}
      <section className='relative w-full py-20 md:py-32 overflow-hidden'>
        <div className='absolute inset-0 bg-linear-to-br from-blue-900/20 to-purple-900/20 z-0' />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-10 z-0" />

        <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col items-center text-center max-w-3xl mx-auto space-y-8'>
            <div className='space-y-4'>
              <h1 className='text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-500'>
                DYOR Hub
              </h1>
              <p className='text-xl md:text-2xl text-zinc-300 max-w-2xl'>
                A central place for reliable Solana memecoin discussions
              </p>
            </div>

            <Card className='w-full max-w-2xl border-zinc-800 bg-zinc-950/70 backdrop-blur-xs shadow-xl'>
              <CardContent className='pt-6 pb-6'>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='flex flex-col sm:flex-row gap-2 sm:gap-0'>
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
                        className='h-12 pl-10 w-full border-zinc-800 bg-black/50 text-base placeholder:text-zinc-500 rounded-lg sm:rounded-r-none'
                      />
                    </div>
                    <Button
                      type='submit'
                      className='h-12 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 text-base font-medium text-white rounded-lg sm:rounded-l-none cursor-pointer'>
                      Find Token
                    </Button>
                  </div>
                  {error && (
                    <p className='text-sm font-medium text-red-500' role='alert'>
                      {error}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-16 bg-black'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-white'>Features</h2>
            <p className='mt-4 text-zinc-400 max-w-2xl mx-auto'>
              Get reliable information and avoid scams through community verification
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {/* Feature 1 */}
            <Card className='bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50 transition-all duration-300'>
              <CardHeader className='pb-2'>
                <div className='h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4'>
                  <Users className='h-6 w-6 text-blue-400' />
                </div>
                <CardTitle className='text-xl font-semibold text-white'>Discuss</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className='text-zinc-400'>
                  Join conversations about memecoins with Twitter-verified users
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className='bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all duration-300'>
              <CardHeader className='pb-2'>
                <div className='h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4'>
                  <Newspaper className='h-6 w-6 text-purple-400' />
                </div>
                <CardTitle className='text-xl font-semibold text-white'>Get Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className='text-zinc-400'>
                  Find memecoin news and updates from verified sources
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className='bg-zinc-900/50 border-zinc-800 hover:border-green-500/50 transition-all duration-300'>
              <CardHeader className='pb-2'>
                <div className='h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4'>
                  <MessageSquare className='h-6 w-6 text-green-400' />
                </div>
                <CardTitle className='text-xl font-semibold text-white'>Share Knowledge</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className='text-zinc-400'>
                  Help others avoid scams by sharing your memecoin research
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
