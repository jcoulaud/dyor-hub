'use client';

import type { CommentSectionHandle } from '@/components/comments/CommentSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SolanaTrackerHoldersChartResponse, Token, TokenCall, TokenStats } from '@dyor-hub/types';
import { BarChart3, MessageSquare, Shield, TrendingUp, Twitter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, RefObject, useEffect, useState } from 'react';

import { TokenAnalysisTab } from './tabs/TokenAnalysisTab';
import { TokenCallsTab } from './tabs/TokenCallsTab';
import { TokenDiscussionTab } from './tabs/TokenDiscussionTab';
import { TokenSecurityTab } from './tabs/TokenSecurityTab';
import { TokenTwitterTab } from './tabs/TokenTwitterTab';

interface TokenPageTabsProps {
  tokenData: Token | null;
  tokenStatsData: TokenStats | null;
  userCalls: TokenCall[];
  isLoadingUserCalls: boolean;
  holderHistoryData: SolanaTrackerHoldersChartResponse | null;
  isLoadingHolderHistory: boolean;
  userDyorHubBalance?: number;
  currentPrice: number;
  isPriceValid: boolean;
  mintAddress: string;
  commentSectionRef: RefObject<CommentSectionHandle | null>;
  commentIdFromProps?: string;
  onCallCreated: () => void;
}

export const TokenPageTabs = memo(function TokenPageTabs({
  tokenData,
  tokenStatsData,
  userCalls,
  isLoadingUserCalls,
  holderHistoryData,
  isLoadingHolderHistory,
  userDyorHubBalance,
  currentPrice,
  isPriceValid,
  mintAddress,
  commentSectionRef,
  commentIdFromProps,
  onCallCreated,
}: TokenPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    // If there's a commentId, default to discussion tab
    if (commentIdFromProps && !tabParam) {
      return 'discussion';
    }
    return tabParam || 'security';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    } else if (commentIdFromProps && !tabParam) {
      setActiveTab('discussion');
    }
  }, [searchParams, commentIdFromProps, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', value);

    const newUrl = `/tokens/${mintAddress}?${newSearchParams.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className='w-full'>
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        {/* Tab Navigation */}
        <div className='relative z-50 mb-8'>
          <TabsList
            className={`grid w-full ${tokenData?.twitterHandle ? 'grid-cols-5' : 'grid-cols-4'} bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 p-1.5 h-12 rounded-2xl group/tabs`}>
            <TabsTrigger
              value='security'
              className='tab-trigger tab-1 flex items-center gap-3 text-sm font-semibold text-zinc-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white hover:bg-zinc-700/50 hover:text-white rounded-xl'>
              <Shield className='w-4 h-4' />
              <span className='hidden sm:inline'>Security</span>
            </TabsTrigger>
            <TabsTrigger
              value='discussion'
              className='tab-trigger tab-2 flex items-center gap-3 text-sm font-semibold text-zinc-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white hover:bg-zinc-700/50 hover:text-white rounded-xl'>
              <MessageSquare className='w-4 h-4' />
              <span className='hidden sm:inline'>Discussion</span>
            </TabsTrigger>
            <TabsTrigger
              value='analysis'
              className='tab-trigger tab-3 flex items-center gap-3 text-sm font-semibold text-zinc-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white hover:bg-zinc-700/50 hover:text-white rounded-xl'>
              <BarChart3 className='w-4 h-4' />
              <span className='hidden sm:inline'>Analysis</span>
            </TabsTrigger>
            <TabsTrigger
              value='calls'
              className='tab-trigger tab-4 flex items-center gap-3 text-sm font-semibold text-zinc-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white hover:bg-zinc-700/50 hover:text-white rounded-xl'>
              <TrendingUp className='w-4 h-4' />
              <span className='hidden sm:inline'>Calls</span>
            </TabsTrigger>
            {tokenData?.twitterHandle && (
              <TabsTrigger
                value='twitter'
                className='tab-trigger tab-5 flex items-center gap-3 text-sm font-semibold text-zinc-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white hover:bg-zinc-700/50 hover:text-white rounded-xl'>
                <Twitter className='w-4 h-4' />
                <span className='hidden sm:inline'>Twitter Feed</span>
              </TabsTrigger>
            )}
            <style jsx global>{`
              /* Hover state - individual tab gets background */
              .tab-trigger:hover {
                background-color: rgba(63, 63, 70, 0.5) !important;
                color: white !important;
              }

              /* When any tab is hovered, completely stop all animations */
              .group\/tabs:hover .tab-trigger {
                animation: none !important;
                background-color: transparent;
                color: rgb(212 212 216);
              }

              /* Keep the hovered tab highlighted even when animations are stopped */
              .group\/tabs:hover .tab-trigger:hover {
                background-color: rgba(63, 63, 70, 0.5) !important;
                color: white !important;
              }

              /* 4-tab animation (when no Twitter) */
              .tab-1 {
                animation: tabSequence4 4s infinite;
              }
              .tab-2 {
                animation: tabSequence4 4s infinite;
                animation-delay: -3s;
              }
              .tab-3 {
                animation: tabSequence4 4s infinite;
                animation-delay: -2s;
              }
              .tab-4 {
                animation: tabSequence4 4s infinite;
                animation-delay: -1s;
              }

              /* 5-tab animation (when Twitter exists) */
              ${tokenData?.twitterHandle
                ? `
                .tab-1 { animation: tabSequence5 5s infinite; }
                .tab-2 { animation: tabSequence5 5s infinite; animation-delay: -4s; }
                .tab-3 { animation: tabSequence5 5s infinite; animation-delay: -3s; }
                .tab-4 { animation: tabSequence5 5s infinite; animation-delay: -2s; }
                .tab-5 { animation: tabSequence5 5s infinite; animation-delay: -1s; }
              `
                : ''}

              @keyframes tabSequence4 {
                0%,
                25% {
                  background-color: rgba(63, 63, 70, 0.5);
                  color: white;
                }
                25.01%,
                100% {
                  background-color: transparent;
                  color: rgb(212 212 216);
                }
              }

              @keyframes tabSequence5 {
                0%,
                20% {
                  background-color: rgba(63, 63, 70, 0.5);
                  color: white;
                }
                20.01%,
                100% {
                  background-color: transparent;
                  color: rgb(212 212 216);
                }
              }
            `}</style>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className='relative'>
          <TabsContent value='security' className='mt-0 focus-visible:outline-none'>
            <TokenSecurityTab
              tokenData={tokenData}
              tokenStatsData={tokenStatsData}
              holderHistoryData={holderHistoryData}
              isLoadingHolderHistory={isLoadingHolderHistory}
              mintAddress={mintAddress}
            />
          </TabsContent>

          <TabsContent value='discussion' className='mt-0 focus-visible:outline-none'>
            <TokenDiscussionTab
              tokenData={tokenData}
              commentSectionRef={commentSectionRef}
              commentIdFromProps={commentIdFromProps}
            />
          </TabsContent>

          <TabsContent value='analysis' className='mt-0 focus-visible:outline-none'>
            <TokenAnalysisTab
              mintAddress={mintAddress}
              tokenData={tokenData}
              userDyorHubBalance={userDyorHubBalance}
            />
          </TabsContent>

          <TabsContent value='calls' className='mt-0 focus-visible:outline-none'>
            <TokenCallsTab
              tokenData={tokenData}
              tokenStatsData={tokenStatsData}
              userCalls={userCalls}
              isLoadingUserCalls={isLoadingUserCalls}
              currentPrice={currentPrice}
              isPriceValid={isPriceValid}
              onCallCreated={onCallCreated}
            />
          </TabsContent>

          {tokenData?.twitterHandle && (
            <TabsContent value='twitter' className='mt-0 focus-visible:outline-none'>
              <TokenTwitterTab tokenData={tokenData} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
});
