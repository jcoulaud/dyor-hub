import React from 'react';
import { FeatureSnippets } from './FeatureSnippets';
import { HotTokensFeed } from './HotTokensFeed';
import { LatestAddedTokens } from './LatestAddedTokens';
import { LatestCommentsFeed } from './LatestCommentsFeed';
import { LatestTokenCallsFeed } from './LatestTokenCallsFeed';
import { SearchToken } from './SearchToken';
import { SuccessfulTokenCallsFeed } from './SuccessfulTokenCallsFeed';
import { TopReputationUsers } from './TopReputationUsers';

export const HomepageGrid: React.FC = () => {
  return (
    <div className='flex flex-col gap-4 md:gap-6 lg:gap-8 p-4 md:p-6 lg:p-8'>
      {/* Main Bento Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {/* Row 1 */}
        <div className='md:col-span-2 lg:col-span-2 lg:row-span-1'>
          <SearchToken />
        </div>
        <div className='lg:col-span-1'>
          <LatestAddedTokens />
        </div>
        <div className='lg:col-span-1'>
          <HotTokensFeed />
        </div>

        {/* Row 2 */}
        <div className='lg:col-span-1'>
          <LatestTokenCallsFeed />
        </div>
        <div className='lg:col-span-1'>
          <SuccessfulTokenCallsFeed />
        </div>
        <div className='lg:col-span-1'>
          <LatestCommentsFeed />
        </div>
        <div className='lg:col-span-1'>
          <TopReputationUsers />
        </div>
      </div>

      {/* Feature Snippets Section Below Grid */}
      <FeatureSnippets />
    </div>
  );
};
