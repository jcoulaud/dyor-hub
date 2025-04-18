import React from 'react';
import { HotTokensFeed } from './HotTokensFeed';
import { LatestAddedTokens } from './LatestAddedTokens';
import { LatestCommentsFeed } from './LatestCommentsFeed';
import { LatestTokenCallsFeed } from './LatestTokenCallsFeed';
import { PlatformFeatures } from './PlatformFeatures';
import { SearchToken } from './SearchToken';
import { SuccessfulTokenCallsFeed } from './SuccessfulTokenCallsFeed';
import { TopReputationUsers } from './TopReputationUsers';

export const HomepageGrid: React.FC = () => {
  return (
    <div className='w-full bg-black py-4 min-h-screen'>
      <div className='max-w-[1600px] mx-auto px-3 sm:px-6'>
        {/* Bento Grid Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 mt-6 relative z-10'>
          {/* Left Column */}
          <div className='lg:col-span-3 space-y-5'>
            <LatestTokenCallsFeed />
            <LatestAddedTokens />
          </div>

          {/* Middle-Right Columns */}
          <div className='lg:col-span-9 space-y-5'>
            {/* Platform Features and Hot Tokens */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5'>
              <div className='lg:col-span-8'>
                <PlatformFeatures />
              </div>
              <div className='lg:col-span-4'>
                <HotTokensFeed />
              </div>
            </div>

            {/* Search, Comments and Successful Calls */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5'>
              <div className='lg:col-span-7'>
                <SearchToken />
                <div className='mt-5'>
                  <LatestCommentsFeed />
                </div>
              </div>
              <div className='lg:col-span-5'>
                <SuccessfulTokenCallsFeed />
              </div>
            </div>

            {/* Top Contributors */}
            <div className='w-full'>
              <TopReputationUsers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
