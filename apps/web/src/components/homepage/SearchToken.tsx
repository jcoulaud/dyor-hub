import { cn, isValidSolanaAddress } from '@/lib/utils';
import { Loader2, Search } from 'lucide-react';
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
      {/* Subtle border */}
      <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 via-emerald-500/20 to-blue-600/30 rounded-xl blur-md opacity-30 z-0'></div>

      {/* Content card */}
      <div className='relative rounded-xl bg-black border border-zinc-800/60 shadow-xl overflow-hidden z-10'>
        {/* Deep space gradient base */}
        <div className='absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black/80 pointer-events-none' />

        {/* Multi-layered gradient effects */}
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.5),transparent_90%)] pointer-events-none' />

        {/* Strategic gradient orbs */}
        <div
          className='absolute -left-20 top-1/2 w-[400px] h-[400px] rounded-full bg-blue-600/10 filter blur-[100px] opacity-60 animate-pulse pointer-events-none'
          style={{ animationDuration: '15s' }}
        />
        <div
          className='absolute -right-20 top-1/4 w-[350px] h-[350px] rounded-full bg-emerald-500/10 filter blur-[100px] opacity-50 animate-pulse-slow pointer-events-none'
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
        <div
          className='absolute top-3/4 left-1/4 w-[200px] h-[200px] rounded-full bg-purple-500/10 filter blur-[80px] opacity-60 animate-pulse-slow pointer-events-none'
          style={{ animationDuration: '20s', animationDelay: '0.5s' }}
        />

        {/* Grid overlay with depth effect */}
        <div
          className='absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none'
          style={{
            backgroundSize: '30px 30px',
            backgroundPosition: 'center',
            transform: 'perspective(1000px) rotateX(5deg)',
          }}
        />

        {/* Subtle noise texture */}
        <div className='absolute inset-0 bg-noise opacity-[0.02] pointer-events-none' />

        {/* Enhanced particle effect */}
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className='absolute rounded-full opacity-0 animate-twinkle pointer-events-none'
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                backgroundColor:
                  i % 4 === 0
                    ? 'rgba(96,165,250,0.8)'
                    : i % 4 === 1
                      ? 'rgba(16,185,129,0.8)'
                      : i % 4 === 2
                        ? 'rgba(139,92,246,0.8)'
                        : 'rgba(255,255,255,0.8)',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${Math.random() * 10 + 5}s`,
                boxShadow: '0 0 4px rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        {/* Content container */}
        <div className='p-5 relative z-10'>
          {/* Search input section */}
          <form onSubmit={handleSubmit} className='relative'>
            <div className='relative flex flex-col sm:flex-row items-center bg-zinc-900/60 rounded-lg border border-zinc-800/60 focus-within:border-blue-500/70 transition-all duration-300 overflow-hidden shadow-lg backdrop-blur-sm'>
              {/* Search input animation */}
              <input
                type='text'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='Enter Solana token address...'
                className={cn(
                  'flex-1 border-0 bg-transparent px-4 py-3 h-12 text-sm text-white placeholder:text-zinc-400 focus:ring-0 focus:outline-none w-full',
                  error && 'text-red-400 placeholder:text-red-400/50',
                )}
              />

              <button
                type='submit'
                className='h-12 bg-gradient-to-r from-blue-600 to-emerald-500 text-white border-0 sm:rounded-r-lg rounded-b-lg w-full sm:w-auto px-5 min-w-[100px] flex items-center justify-center transition-all duration-300 cursor-pointer'>
                {isSearching ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
                  <div className='flex items-center gap-2'>
                    <Search className='h-4 w-4' />
                    <span className='font-medium'>Search</span>
                  </div>
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className='mt-3 text-red-400 text-sm bg-red-900/30 border border-red-800/40 rounded-lg p-2 flex items-start backdrop-blur-sm'>
                <svg
                  className='h-5 w-5 text-red-400 mr-2 flex-shrink-0'
                  viewBox='0 0 24 24'
                  fill='none'>
                  <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' />
                  <path d='M12 8v4' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                  <circle cx='12' cy='16' r='1' fill='currentColor' />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Helper text */}
            <p className='mt-3 text-zinc-400 text-xs'>
              Search any token by mint address. Track price, run due diligence, make predictions,
              and join the conversation.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
});

SearchToken.displayName = 'SearchToken';
