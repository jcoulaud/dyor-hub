import { Twitter } from 'lucide-react';
import { memo } from 'react';

interface TwitterFeedLoaderProps {
  variant?: 'initial' | 'more';
  message?: string;
}

export const TwitterFeedLoader = memo(function TwitterFeedLoader({
  variant = 'initial',
  message,
}: TwitterFeedLoaderProps) {
  if (variant === 'more') {
    return (
      <div className='flex items-center justify-center gap-3 py-4'>
        <div className='relative'>
          <div className='bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2 rounded-xl'>
            <Twitter className='w-4 h-4 text-blue-400 animate-pulse' />
          </div>
          <div className='absolute inset-0 bg-blue-500/10 rounded-xl animate-ping' />
        </div>
        <span className='text-zinc-400 text-sm font-medium'>
          {message || 'Loading more tweets...'}
        </span>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center py-20 px-8'>
      {/* Subtle background glow */}
      <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-600/5 rounded-3xl' />

      {/* Main loading animation */}
      <div className='relative mb-8'>
        {/* Outer glow ring */}
        <div className='absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse' />

        {/* Main icon container */}
        <div className='relative bg-gradient-to-br from-blue-500/20 via-blue-600/20 to-cyan-500/20 p-8 rounded-3xl border border-blue-500/20 backdrop-blur-sm'>
          <Twitter className='w-10 h-10 text-blue-400 animate-pulse' />

          {/* Subtle inner glow */}
          <div
            className='absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-3xl animate-pulse'
            style={{ animationDelay: '0.5s' }}
          />
        </div>

        {/* Floating ring animation */}
        <div
          className='absolute inset-0 border-2 border-blue-500/30 rounded-3xl animate-ping'
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* Loading text */}
      <div className='text-center space-y-3'>
        <h3 className='text-xl font-semibold text-white tracking-tight'>
          {message || 'Loading Twitter feed...'}
        </h3>
        <p className='text-zinc-400 text-sm max-w-xs leading-relaxed'>
          Fetching the latest tweets and updates
        </p>
      </div>
    </div>
  );
});
