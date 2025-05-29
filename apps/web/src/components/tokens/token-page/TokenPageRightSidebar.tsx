'use client';

import { TokenExternalLinks } from '@/components/tokens/TokenExternalLinks';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { isValidSolanaAddress } from '@/lib/utils';
import { SentimentType, TokenSentimentStats } from '@dyor-hub/types';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useState } from 'react';

interface TokenPageRightSidebarProps {
  tokenAddress: string;
  sentimentData?: TokenSentimentStats | null;
  onSentimentVote?: (sentimentType: SentimentType) => void;
  isVoting?: boolean;
}

export const TokenPageRightSidebar = memo(function TokenPageRightSidebar({
  tokenAddress,
  sentimentData,
  onSentimentVote,
  isVoting,
}: TokenPageRightSidebarProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedAddress = searchAddress.trim();

      if (!trimmedAddress) {
        toast({
          title: 'Enter an address',
          description: 'Please enter a token address',
          variant: 'destructive',
        });
        return;
      }

      if (!isValidSolanaAddress(trimmedAddress)) {
        toast({
          title: 'Invalid address',
          description: 'Please enter a valid Solana address',
          variant: 'destructive',
        });
        return;
      }

      setIsSearching(true);
      try {
        router.push(`/tokens/${trimmedAddress}`);
        setSearchAddress('');
      } finally {
        setIsSearching(false);
      }
    },
    [searchAddress, router, toast],
  );

  return (
    <div className='h-full flex flex-col space-y-6'>
      {/* Token Sentiment Section */}
      {sentimentData && onSentimentVote && (
        <div className='p-6 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl'>
          <h3 className='text-sm font-semibold text-white mb-4'>Token Sentiment</h3>
          <div className='grid grid-cols-3 gap-2'>
            {/* Bullish Card */}
            <div
              className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg py-3 px-2 border ${
                sentimentData?.userSentiment === SentimentType.BULLISH
                  ? 'border-green-500/50 bg-green-900/20'
                  : 'border-transparent hover:border-green-500/20 hover:bg-green-900/10'
              } transition-all duration-200 cursor-pointer ${
                isVoting ? 'opacity-50 pointer-events-none' : ''
              } transform hover:scale-105 active:scale-95 min-h-[70px]`}
              onClick={() => onSentimentVote(SentimentType.BULLISH)}>
              <div className='text-base mb-1'>🚀</div>
              <div className='font-bold text-sm text-white text-center'>
                {sentimentData?.bullishCount || 0}
              </div>
            </div>

            {/* Bearish Card */}
            <div
              className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg py-3 px-2 border ${
                sentimentData?.userSentiment === SentimentType.BEARISH
                  ? 'border-red-500/50 bg-red-900/20'
                  : 'border-transparent hover:border-red-500/20 hover:bg-red-900/10'
              } transition-all duration-200 cursor-pointer ${
                isVoting ? 'opacity-50 pointer-events-none' : ''
              } transform hover:scale-105 active:scale-95 min-h-[70px]`}
              onClick={() => onSentimentVote(SentimentType.BEARISH)}>
              <div className='text-base mb-1'>💩</div>
              <div className='font-bold text-sm text-white text-center'>
                {sentimentData?.bearishCount || 0}
              </div>
            </div>

            {/* Red Flag Card */}
            <div
              className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg py-3 px-2 border ${
                sentimentData?.userSentiment === SentimentType.RED_FLAG
                  ? 'border-orange-500/50 bg-orange-900/20'
                  : 'border-transparent hover:border-yellow-500/20 hover:bg-yellow-900/10'
              } transition-all duration-200 cursor-pointer ${
                isVoting ? 'opacity-50 pointer-events-none' : ''
              } transform hover:scale-105 active:scale-95 min-h-[70px]`}
              onClick={() => onSentimentVote(SentimentType.RED_FLAG)}>
              <div className='text-base mb-1'>🚩</div>
              <div className='font-bold text-sm text-white text-center'>
                {sentimentData?.redFlagCount || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Links Section */}
      <div className='p-6 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl'>
        <h3 className='text-sm font-semibold text-white mb-4'>External Links</h3>
        <TokenExternalLinks tokenAddress={tokenAddress} className='flex-wrap' />
      </div>

      {/* Search Token Section */}
      <div className='p-6 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl'>
        <h3 className='text-sm font-semibold text-white mb-4'>Search Token</h3>
        <div className='relative group'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300'></div>

          <form onSubmit={handleSearchSubmit} className='relative'>
            <div className='relative'>
              <Input
                type='text'
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder='Enter token address'
                className='pr-12 h-11 border-zinc-600/50 bg-zinc-900/80 backdrop-blur-sm text-white placeholder:text-zinc-400 rounded-xl transition-all duration-200 focus:border-emerald-500/70 focus:bg-zinc-900/90 focus:ring-2 focus:ring-emerald-500/20'
                disabled={isSearching}
              />
              <button
                type='submit'
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  isSearching ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
                }`}
                disabled={isSearching}>
                {isSearching ? (
                  <svg
                    className='animate-spin h-3.5 w-3.5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'>
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                ) : (
                  <Search className='h-3.5 w-3.5 text-white' />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});
