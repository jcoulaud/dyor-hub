'use client';

import { AuthModal } from '@/components/auth/AuthModal';
import type { CommentSectionHandle } from '@/components/comments/CommentSection';
import { EmbedButtonDialog } from '@/components/token/EmbedButtonDialog';
import { TokenPageHeader } from '@/components/tokens/token-page/TokenPageHeader';
import { TokenPageTabs } from '@/components/tokens/token-page/TokenPageTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TokenRiskData } from '@/lib/api';
import { tokenCalls, tokens, users } from '@/lib/api';
import { isValidSolanaAddress } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import {
  SentimentType,
  SolanaTrackerHoldersChartResponse,
  Token,
  TokenCall,
  TokenSentimentStats,
  TokenStats as TokenStatsType,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import { notFound, usePathname } from 'next/navigation';
import { use, useCallback, useEffect, useRef, useState } from 'react';

interface PageProps {
  params: Promise<{ mintAddress: string }>;
  commentId?: string;
}

export default function Page({ params, commentId }: PageProps) {
  const { mintAddress } = use(params);
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const commentIdFromProps =
    commentId || (pathname && pathname.includes('/comments/'))
      ? pathname?.split('/comments/')[1]?.split('/')[0]
      : undefined;

  const [tokenData, setTokenData] = useState<Token | null>(null);
  const [tokenStatsData, setTokenStatsData] = useState<TokenStatsType | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isHeaderLoaded, setIsHeaderLoaded] = useState(false);
  const [sentimentData, setSentimentData] = useState<TokenSentimentStats | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [userCalls, setUserCalls] = useState<TokenCall[]>([]);
  const [isLoadingUserCalls, setIsLoadingUserCalls] = useState<boolean>(true);
  const [tokenHistoryData, setTokenHistoryData] = useState<TwitterUsernameHistoryEntity | null>(
    null,
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const commentSectionRef = useRef<CommentSectionHandle | null>(null);
  const [isVerifyingCreator, setIsVerifyingCreator] = useState(false);
  const [userDyorHubBalance, setUserDyorHubBalance] = useState<number | undefined>(undefined);
  const [holderHistoryData, setHolderHistoryData] =
    useState<SolanaTrackerHoldersChartResponse | null>(null);
  const [isLoadingHolderHistory, setIsLoadingHolderHistory] = useState<boolean>(true);
  const [riskData, setRiskData] = useState<TokenRiskData | null>(null);
  const [isLoadingRiskData, setIsLoadingRiskData] = useState<boolean>(true);

  const { toast } = useToast();

  if (!isValidSolanaAddress(mintAddress)) {
    notFound();
  }

  const fetchData = async () => {
    try {
      const [tokenResponse, statsResponse] = await Promise.all([
        tokens.getByMintAddress(mintAddress),
        tokens.getTokenStats(mintAddress),
      ]);

      if (!tokenResponse) {
        notFound();
      }

      setTokenData(tokenResponse);
      setTokenStatsData(statsResponse);
      setIsHeaderLoaded(true);
    } catch {
      notFound();
    } finally {
      setIsPageLoading(false);
    }
  };

  const fetchUserCalls = async () => {
    try {
      const callsData = await tokenCalls.getTokenCalls(mintAddress);
      setUserCalls(callsData?.items || []);
    } catch {
      setUserCalls([]);
    } finally {
      setIsLoadingUserCalls(false);
    }
  };

  const fetchHolderHistory = async () => {
    try {
      const holderData = await tokens.getHolderHistory(mintAddress);
      setHolderHistoryData(holderData);
    } catch {
      setHolderHistoryData(null);
    } finally {
      setIsLoadingHolderHistory(false);
    }
  };

  const fetchSentimentData = async () => {
    try {
      const data = await tokens.getTokenSentiments(mintAddress);
      setSentimentData(data);
    } catch {
      setSentimentData(null);
    }
  };

  const fetchRiskData = async () => {
    try {
      const data = await tokens.getSolanaTrackerRisk(mintAddress);
      setRiskData(data);
    } catch {
      setRiskData(null);
    } finally {
      setIsLoadingRiskData(false);
    }
  };

  const fetchTokenHistory = async () => {
    try {
      const historyData = await tokens.getTwitterHistory(mintAddress);
      setTokenHistoryData(historyData);
    } catch {
      setTokenHistoryData(null);
    }
  };

  const fetchUserBalance = async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const balanceResponse = await users.getMyDyorhubBalance();
      setUserDyorHubBalance(balanceResponse.balance);
    } catch {
      setUserDyorHubBalance(0);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUserCalls();
    fetchHolderHistory();
    fetchSentimentData();
    fetchRiskData();
    fetchTokenHistory();
  }, [mintAddress]);

  useEffect(() => {
    if (!isLoading) {
      fetchUserBalance();
    }
  }, [isLoading, isAuthenticated, user?.id]);

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleSentimentVote = useCallback(
    async (sentimentType: SentimentType) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      setIsVoting(true);
      try {
        if (sentimentData?.userSentiment === sentimentType) {
          await tokens.removeSentiment(mintAddress);
          toast({
            title: 'Sentiment removed',
            description: 'Your sentiment has been removed.',
          });
        } else {
          await tokens.addOrUpdateSentiment(mintAddress, sentimentType);
          toast({
            title: 'Sentiment recorded',
            description: 'Your sentiment has been recorded.',
          });
        }

        const updatedData = await tokens.getTokenSentiments(mintAddress);
        setSentimentData(updatedData);
      } catch (error) {
        console.error('Error updating sentiment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update sentiment.';
        toast({
          title: 'Error',
          description: `${errorMessage} Please try again.`,
          variant: 'destructive',
        });
      } finally {
        setIsVoting(false);
      }
    },
    [isAuthenticated, sentimentData, mintAddress, toast],
  );

  const handleCallCreated = () => {
    fetchUserCalls();
  };

  const handleVerifyCreator = async () => {
    if (!isAuthenticated || !user?.id) {
      setShowAuthModal(true);
      return;
    }

    setIsVerifyingCreator(true);
    try {
      const result = await tokens.verifyTokenCreator(mintAddress);

      if (result.success) {
        toast({
          title: 'Creator verified',
          description: result.message || 'You have been verified as the creator of this token.',
        });
        fetchData();
      } else {
        toast({
          title: 'Verification failed',
          description: result.message || 'Failed to verify creator.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying creator:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify creator.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingCreator(false);
    }
  };

  const currentPrice = tokenStatsData?.price || 0;
  const isPriceValid = currentPrice > 0;

  return (
    <div className='bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950'>
      {/* Background Pattern */}
      <div className='fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-900/5 to-transparent pointer-events-none -z-10' />
      <div className='fixed inset-0 opacity-30 pointer-events-none -z-10'>
        <div className='absolute inset-0 bg-[length:60px_60px] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)]' />
      </div>

      <div className='relative flex'>
        {/* Fixed Left Sidebar - Hidden on mobile */}
        <div className='hidden lg:block fixed left-0 top-16 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-700/50 overflow-hidden z-10'>
          <div className='h-full overflow-y-auto scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600'>
            <TokenPageHeader
              tokenData={tokenData}
              isPageLoading={isPageLoading}
              isHeaderLoaded={isHeaderLoaded}
              tokenHistoryData={tokenHistoryData}
              riskData={riskData}
              isLoadingRiskData={isLoadingRiskData}
              isVerifyingCreator={isVerifyingCreator}
              onVerifyCreator={handleVerifyCreator}
              onShowEmbedDialog={() => setShowEmbedDialog(true)}
              user={user}
              isAuthenticated={isAuthenticated}
              sentimentData={sentimentData}
              onSentimentVote={handleSentimentVote}
              isVoting={isVoting}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className='w-full lg:ml-80'>
          {/* Mobile Token Header - Only visible on mobile */}
          <div className='lg:hidden bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-700/50 relative z-20'>
            {isPageLoading || !isHeaderLoaded ? (
              <div className='flex items-center gap-3 p-4'>
                <Skeleton className='w-12 h-12 rounded-lg' />
                <div className='flex-1'>
                  <Skeleton className='w-32 h-5 mb-1' />
                  <Skeleton className='w-20 h-4' />
                </div>
                <Skeleton className='w-8 h-8 rounded' />
              </div>
            ) : tokenData ? (
              <div className='w-full'>
                <TokenPageHeader
                  tokenData={tokenData}
                  isPageLoading={isPageLoading}
                  isHeaderLoaded={isHeaderLoaded}
                  tokenHistoryData={tokenHistoryData}
                  riskData={riskData}
                  isLoadingRiskData={isLoadingRiskData}
                  isVerifyingCreator={isVerifyingCreator}
                  onVerifyCreator={handleVerifyCreator}
                  onShowEmbedDialog={() => setShowEmbedDialog(true)}
                  user={user}
                  isAuthenticated={isAuthenticated}
                  sentimentData={sentimentData}
                  onSentimentVote={handleSentimentVote}
                  isVoting={isVoting}
                />
              </div>
            ) : (
              <div className='text-center py-4'>
                <span className='text-red-400 font-medium'>Token not found</span>
              </div>
            )}
          </div>

          <div className='container mx-auto px-6 py-8 max-w-6xl relative z-30'>
            {/* Tabs Section */}
            <div className='relative z-40'>
              <TokenPageTabs
                tokenData={tokenData}
                tokenStatsData={tokenStatsData}
                userCalls={userCalls}
                isLoadingUserCalls={isLoadingUserCalls}
                holderHistoryData={holderHistoryData}
                isLoadingHolderHistory={isLoadingHolderHistory}
                userDyorHubBalance={userDyorHubBalance}
                currentPrice={currentPrice}
                isPriceValid={isPriceValid}
                mintAddress={mintAddress}
                commentSectionRef={commentSectionRef}
                commentIdFromProps={commentIdFromProps}
                onCallCreated={handleCallCreated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
      <EmbedButtonDialog
        tokenId={mintAddress}
        isOpen={showEmbedDialog}
        onOpenChange={setShowEmbedDialog}
      />
    </div>
  );
}
