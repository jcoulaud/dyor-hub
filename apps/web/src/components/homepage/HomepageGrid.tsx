import { memo } from 'react';
import { HotTokensFeed } from './HotTokensFeed';
import { LatestAddedTokens } from './LatestAddedTokens';
import { LatestCommentsFeed } from './LatestCommentsFeed';
import { LatestTokenCallsFeed } from './LatestTokenCallsFeed';
import { PlatformFeatures } from './PlatformFeatures';
import { SearchToken } from './SearchToken';
import { SuccessfulTokenCallsFeed } from './SuccessfulTokenCallsFeed';
import { TopReputationUsers } from './TopReputationUsers';

export const HomepageGrid = memo(() => {
  return (
    <div className='w-full pt-4 pb-24 relative overflow-x-hidden'>
      <div className='max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        {/* Grid Layout */}
        <div className='flex flex-col gap-6'>
          {/* Mobile-first: Search Token at top */}
          <div className='lg:hidden transform hover:scale-[1.01] transition-transform duration-300'>
            <SearchToken />
          </div>

          {/* Main Content Area */}
          <div className='grid grid-cols-12 gap-6'>
            {/* Left Column */}
            <div className='col-span-12 lg:col-span-3 flex flex-col gap-6 h-full'>
              <div className='h-full transform hover:scale-[1.02] transition-transform duration-300'>
                <LatestTokenCallsFeed />
              </div>
              <div className='h-full transform hover:scale-[1.02] transition-transform duration-300'>
                <LatestAddedTokens />
              </div>
            </div>

            {/* Middle Column */}
            <div className='col-span-12 lg:col-span-6 flex flex-col gap-6 h-full'>
              {/* Search Token - Desktop only */}
              <div className='hidden lg:block transform hover:scale-[1.01] transition-transform duration-300'>
                <SearchToken />
              </div>
              <div className='transform hover:scale-[1.01] transition-transform duration-300'>
                <LatestCommentsFeed />
              </div>
              <div className='transform hover:scale-[1.01] transition-transform duration-300'>
                <TopReputationUsers />
              </div>
            </div>

            {/* Right Column */}
            <div className='col-span-12 lg:col-span-3 flex flex-col gap-6 h-full'>
              <div className='h-full transform hover:scale-[1.02] transition-transform duration-300'>
                <HotTokensFeed />
              </div>
              <div className='h-full transform hover:scale-[1.02] transition-transform duration-300'>
                <SuccessfulTokenCallsFeed />
              </div>
            </div>
          </div>

          {/* Bottom Full Width Row */}
          <div className='w-full mt-6 transform hover:scale-[1.01] transition-transform duration-300'>
            <PlatformFeatures />
          </div>
        </div>
      </div>
    </div>
  );
});

HomepageGrid.displayName = 'HomepageGrid';
