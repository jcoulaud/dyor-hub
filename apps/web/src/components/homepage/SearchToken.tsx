import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, isValidSolanaAddress } from '@/lib/utils';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { FormEvent, useCallback, useState } from 'react';

export const SearchToken: React.FC = () => {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (isSearching) return;
      setError('');
      const trimmedAddress = address.trim();

      if (!trimmedAddress) {
        setError('Please enter a token address');
        return;
      }

      if (isValidSolanaAddress(trimmedAddress)) {
        setIsSearching(true);
        try {
          router.push(`/tokens/${trimmedAddress}`);
        } catch (err) {
          setError('Navigation failed. Please try again.');
          console.error('Navigation error:', err);
          setIsSearching(false);
        }
      } else {
        setError('Invalid Solana address format entered.');
      }
    },
    [address, router, isSearching],
  );

  return (
    <div className='h-full bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-6 flex flex-col justify-center'>
      <h1 className='text-xl font-semibold text-zinc-200 mb-2'>DYOR Hub</h1>
      <p className='text-sm text-zinc-400 mb-4'>
        Search for Solana tokens to find insights and community sentiment.
      </p>
      <form onSubmit={handleSubmit} className='space-y-3'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-grow'>
            {!isSearching && (
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none' />
            )}
            {isSearching && (
              <Loader2 className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 animate-spin' />
            )}
            <Input
              type='search'
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError('');
              }}
              placeholder='Enter token name or mint address...'
              className={cn('pl-10 h-11 w-full', isSearching && 'opacity-70 cursor-not-allowed')}
              disabled={isSearching}
            />
          </div>
          <Button
            type='submit'
            disabled={isSearching || !address.trim()}
            className='h-11 min-w-[110px] bg-gradient-to-r from-blue-500 to-purple-500 hover:brightness-110 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 flex-shrink-0'
            aria-label={isSearching ? 'Searching...' : 'Find Token'}>
            {isSearching ? <Loader2 className='h-5 w-5 animate-spin' /> : 'Find Token'}
          </Button>
        </div>
        {error && (
          <p className='text-sm font-medium text-red-500' role='alert'>
            {error}
          </p>
        )}
      </form>
    </div>
  );
};
