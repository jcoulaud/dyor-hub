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
    <div className='bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden p-4 relative'>
      <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
        <div className='flex items-center gap-2 mb-2'>
          <Search className='h-5 w-5 text-blue-400' />
          <h2 className='text-base font-medium text-white'>Search Tokens</h2>
        </div>

        <div className='flex gap-2'>
          <div className='relative flex-1'>
            {isSearching ? (
              <Loader2 className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 animate-spin' />
            ) : (
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
            )}

            <Input
              type='text'
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError('');
              }}
              placeholder='Enter Solana token address'
              className={cn(
                'pl-10 py-2 h-10 bg-zinc-800/50 border-zinc-700/50 rounded-lg text-white text-sm placeholder:text-zinc-500',
                isSearching && 'opacity-70',
              )}
              disabled={isSearching}
            />
          </div>

          <Button
            type='submit'
            disabled={isSearching || !address.trim()}
            className='bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-lg text-sm px-4'>
            {isSearching ? 'Searching...' : 'Find'}
          </Button>
        </div>

        {error && <p className='text-sm text-red-400 mt-1'>{error}</p>}
      </form>
    </div>
  );
};
