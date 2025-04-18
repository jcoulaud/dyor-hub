import { memo } from 'react';

export const Hero = memo(() => {
  return (
    <section className='relative w-full py-6 md:py-8 lg:py-12 overflow-hidden'>
      {/* Animated background elements */}
      <div className='absolute inset-0 -z-10'>
        <div className='absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-full filter blur-[100px] opacity-60 animate-pulse animate-slow'></div>
        <div className='absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full filter blur-[100px] opacity-60 animate-pulse animate-slower'></div>
      </div>

      {/* Subtle grid pattern overlay */}
      <div className='absolute inset-0 bg-[url("/grid-pattern.svg")] bg-repeat opacity-5 -z-10'></div>

      <div className='container mx-auto px-3 md:px-6 relative z-10'>
        <div className='flex flex-col items-center text-center max-w-4xl mx-auto'>
          <div className='space-y-3 md:space-y-4'>
            {/* Animated badge with full address display */}
            <div className='inline-flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-full text-xs font-medium text-zinc-300 animate-fade-in-up w-auto max-w-full overflow-x-auto no-scrollbar'>
              <span className='relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1.5 sm:mr-2 flex-shrink-0'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500'></span>
              </span>
              <span className='text-[10px] sm:text-xs whitespace-nowrap'>
                2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump
              </span>
            </div>

            <h1 className='text-2xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white'>
              Your trusted source for Solana memecoin community insights
            </h1>
          </div>
        </div>
      </div>

      {/* Animated lines decorative element */}
      <div className='absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent'></div>

      {/* Add custom style for removing scrollbar but keeping scroll functionality */}
      <style jsx global>{`
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
        .animate-slow {
          animation-duration: 8s;
        }
        .animate-slower {
          animation-duration: 10s;
        }
      `}</style>
    </section>
  );
});

Hero.displayName = 'Hero';
