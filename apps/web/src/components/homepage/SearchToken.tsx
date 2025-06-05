import { cn, isValidSolanaAddress } from '@/lib/utils';
import { Loader2, Search, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, memo, useCallback, useState } from 'react';

export const SearchToken = memo(() => {
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
        } catch {
          setError('Navigation failed. Please try again.');
          setIsSearching(false);
        }
      } else {
        setError('Invalid Solana address format entered.');
      }
    },
    [address, router, isSearching],
  );

  return (
    <div className='w-full relative'>
      {/* Border */}
      <div className='absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-purple-500 via-emerald-400 to-blue-500 rounded-2xl blur-sm opacity-80 animate-pulse z-0'></div>
      <div className='absolute -inset-1 bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400 rounded-xl opacity-60 z-0'></div>

      {/* Content card */}
      <div className='relative rounded-xl bg-zinc-900/95 border-2 border-zinc-600/80 shadow-2xl overflow-hidden z-10 backdrop-blur-md'>
        {/* Gradient base */}
        <div className='absolute inset-0 bg-gradient-to-br from-zinc-800/90 via-zinc-900/95 to-zinc-800/90 pointer-events-none' />

        {/* More vibrant gradient effects */}
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.3),transparent_60%)] pointer-events-none' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.25),transparent_60%)] pointer-events-none' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.2),transparent_70%)] pointer-events-none' />

        {/* Gradient orbs */}
        <div
          className='absolute -left-20 top-1/3 w-[500px] h-[500px] rounded-full bg-blue-500/25 filter blur-[120px] opacity-90 animate-pulse pointer-events-none'
          style={{ animationDuration: '12s' }}
        />
        <div
          className='absolute -right-20 top-1/4 w-[400px] h-[400px] rounded-full bg-emerald-400/25 filter blur-[100px] opacity-80 animate-pulse-slow pointer-events-none'
          style={{ animationDuration: '10s', animationDelay: '1s' }}
        />
        <div
          className='absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full bg-purple-500/20 filter blur-[90px] opacity-80 animate-pulse-slow pointer-events-none'
          style={{ animationDuration: '18s', animationDelay: '0.5s' }}
        />

        {/* Enhanced grid overlay */}
        <div
          className='absolute inset-0 bg-grid-pattern opacity-[0.08] pointer-events-none'
          style={{
            backgroundSize: '25px 25px',
            backgroundPosition: 'center',
          }}
        />

        {/* Content container */}
        <div className='pt-4 px-4 pb-3 relative z-10'>
          {/* Search input section */}
          <form onSubmit={handleSubmit} className='relative'>
            <div className='relative flex flex-col sm:flex-row items-center bg-zinc-800/90 rounded-xl border-2 border-zinc-600/80 focus-within:border-blue-400/90 focus-within:shadow-lg focus-within:shadow-blue-500/30 transition-all duration-300 overflow-hidden backdrop-blur-lg'>
              {/* Input */}
              <div className='relative flex-1 w-full'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-300' />
                <input
                  type='text'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder='Enter Solana token address...'
                  className={cn(
                    'w-full border-0 bg-transparent pl-10 pr-4 py-3 h-12 text-sm text-white placeholder:text-zinc-300 focus:ring-0 focus:outline-none',
                    error && 'text-red-400 placeholder:text-red-400/50',
                  )}
                />
              </div>

              {/* Search button */}
              <button
                type='submit'
                disabled={isSearching}
                className='h-12 bg-gradient-to-r from-blue-500 via-emerald-400 to-purple-500 hover:from-blue-600 hover:via-emerald-500 hover:to-purple-600 text-white border-0 sm:rounded-r-xl rounded-b-xl w-full sm:w-auto px-6 min-w-[120px] flex items-center justify-center transition-all duration-300 cursor-pointer font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group'>
                {isSearching ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
                  <div className='flex items-center gap-2'>
                    <Zap className='h-4 w-4 group-hover:animate-pulse' />
                    <span>Search Now</span>
                  </div>
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className='mt-3 text-red-300 text-sm bg-red-900/40 border border-red-700/60 rounded-lg p-2.5 flex items-start backdrop-blur-sm shadow-lg'>
                <svg
                  className='h-4 w-4 text-red-400 mr-2 flex-shrink-0 mt-0.5'
                  viewBox='0 0 24 24'
                  fill='none'>
                  <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' />
                  <path d='M12 8v4' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                  <circle cx='12' cy='16' r='1' fill='currentColor' />
                </svg>
                <span className='font-medium'>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
});

SearchToken.displayName = 'SearchToken';
