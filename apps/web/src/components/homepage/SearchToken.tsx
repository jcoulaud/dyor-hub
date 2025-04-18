import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className='w-full relative group'>
      {/* Enhanced animated gradient border */}
      <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-1000 group-hover:duration-200 animate-gradient-x'></div>

      {/* Glass morphism card */}
      <div className='relative rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 shadow-xl overflow-hidden group-hover:border-zinc-700/50 transition-all duration-300'>
        {/* Geometric light effects */}
        <div className='absolute top-0 left-0 w-full h-full overflow-hidden opacity-50 mix-blend-screen pointer-events-none'>
          <div className='absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl'></div>
          <div className='absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl'></div>
        </div>

        {/* Particle animation overlay */}
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className='absolute rounded-full opacity-0 animate-twinkle'
              style={{
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                backgroundColor: i % 3 === 0 ? '#60A5FA' : i % 3 === 1 ? '#10B981' : '#FFFFFF',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${Math.random() * 6 + 4}s`,
              }}></div>
          ))}
        </div>

        {/* Content container */}
        <div className='p-5 relative z-10'>
          {/* Search input section */}
          <form onSubmit={handleSubmit} className='relative'>
            <div className='relative flex items-center bg-zinc-800/50 rounded-lg border border-zinc-700/30 focus-within:border-blue-500/50 hover:border-blue-500/30 transition-all duration-300 overflow-hidden shadow-inner'>
              {/* Search input animation */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 ease-in-out'></div>

              <div className='flex-grow relative z-10'>
                <Input
                  type='text'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder='Enter Solana token address...'
                  className={cn(
                    'border-0 bg-transparent px-4 py-3 h-12 text-sm text-white placeholder:text-zinc-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                    error && 'text-red-400 placeholder:text-red-400/50',
                  )}
                  disabled={isSearching}
                />
              </div>

              <Button
                type='submit'
                disabled={isSearching}
                className='h-12 bg-gradient-to-r from-blue-600 to-emerald-500 text-white border-0 rounded-r-lg px-5 min-w-[100px] transition-all duration-300 shadow-md opacity-95 hover:opacity-100 hover:scale-[1.02] hover:shadow-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-emerald-500'
                variant='default'>
                {isSearching ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
                  <div className='flex items-center gap-2'>
                    <Search className='h-4 w-4' />
                    <span className='font-medium'>Search</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Error message */}
            {error && (
              <div className='mt-3 text-red-400 text-sm bg-red-900/20 border border-red-900/30 rounded-lg p-2 flex items-start'>
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
            <p className='mt-3 text-zinc-500 text-xs'>
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
