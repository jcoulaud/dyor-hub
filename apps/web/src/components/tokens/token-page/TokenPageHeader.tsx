'use client';

import { SolscanButton } from '@/components/SolscanButton';
import { TokenImage } from '@/components/tokens/TokenImage';
import { TwitterHistoryTooltip } from '@/components/tokens/TwitterHistoryTooltip';
import { WatchlistButton } from '@/components/tokens/WatchlistButton';
import { WebsiteInfoTooltip } from '@/components/tokens/WebsiteInfoTooltip';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TokenRiskData } from '@/lib/api';
import { isValidSolanaAddress } from '@/lib/utils';
import {
  SentimentType,
  Token,
  TokenSentimentStats,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import {
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  ExternalLink,
  Eye,
  MessageSquare,
  Search,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useState } from 'react';

interface TokenPageHeaderProps {
  tokenData: Token | null;
  isLoadingTokenData: boolean;
  tokenHistoryData: TwitterUsernameHistoryEntity | null;
  riskData: TokenRiskData | null;
  isLoadingRiskData: boolean;
  isVerifyingCreator: boolean;
  onVerifyCreator: () => void;
  onShowEmbedDialog: () => void;
  user?: { id: string } | null;
  isAuthenticated: boolean;
  sentimentData?: TokenSentimentStats | null;
  onSentimentVote?: (sentimentType: SentimentType) => void;
  isVoting?: boolean;
}

const isDev = process.env.NODE_ENV === 'development';

export const TokenPageHeader = memo(function TokenPageHeader({
  tokenData,
  isLoadingTokenData,
  tokenHistoryData,
  riskData,
  isLoadingRiskData,
  isVerifyingCreator,
  onVerifyCreator,
  onShowEmbedDialog,
  user,
  isAuthenticated,
  sentimentData,
  onSentimentVote,
  isVoting,
}: TokenPageHeaderProps) {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

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
    <div className='h-full flex flex-col relative'>
      {isLoadingTokenData ? (
        <div className='p-4'>
          {/* Mobile Skeleton Header */}
          <div className='lg:hidden flex items-center gap-3 mb-4'>
            <Skeleton className='w-12 h-12 rounded-lg' />
            <div className='flex-1'>
              <Skeleton className='w-32 h-5 mb-1' />
              <Skeleton className='w-20 h-4' />
            </div>
            <Skeleton className='w-8 h-8 rounded' />
          </div>

          {/* Desktop Skeleton Header */}
          <div className='hidden lg:block space-y-4'>
            <div className='flex items-center gap-4'>
              <Skeleton className='w-16 h-16 rounded-lg' />
              <div className='flex-1'>
                <Skeleton className='w-48 h-6 mb-2' />
                <Skeleton className='w-24 h-4' />
              </div>
            </div>
            <div className='space-y-2'>
              <Skeleton className='w-full h-4' />
              <Skeleton className='w-3/4 h-4' />
            </div>
            <div className='flex gap-2'>
              <Skeleton className='w-8 h-8 rounded' />
              <Skeleton className='w-8 h-8 rounded' />
              <Skeleton className='w-8 h-8 rounded' />
            </div>
          </div>
        </div>
      ) : tokenData ? (
        <>
          {/* Mobile Compact Header */}
          <div className='lg:hidden'>
            <div className='p-4 border-b border-zinc-700/50 relative'>
              {/* Views Counter - Mobile */}
              {tokenData.viewsCount !== undefined && (
                <div className='absolute top-2 right-2 z-10'>
                  <div className='flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30'>
                    <Eye className='w-3 h-3 text-blue-400' />
                    <span className='text-xs font-medium text-white'>
                      {tokenData.viewsCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-lg blur-sm'></div>
                  <TokenImage
                    imageUrl={tokenData.imageUrl}
                    name={tokenData.name}
                    symbol={tokenData.symbol}
                    className='relative w-12 h-12 rounded-lg shadow-lg'
                  />
                </div>
                <div className='flex-1 min-w-0 pr-16'>
                  <h1 className='text-lg font-bold text-white truncate'>{tokenData.name}</h1>
                  <div className='text-zinc-400 font-medium text-sm'>${tokenData.symbol}</div>
                  {tokenData.verifiedCreatorUserId && (
                    <div className='flex items-center gap-1 mt-1'>
                      <Shield className='w-3 h-3 text-emerald-400' />
                      <span className='text-xs text-emerald-300'>Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bookmark and Dropdown Icons */}
              <div className='absolute bottom-2 right-2 flex items-center gap-2'>
                <WatchlistButton
                  mintAddress={tokenData.mintAddress}
                  initialWatchlistStatus={tokenData.isWatchlisted}
                  onStatusChange={() => {}}
                  size='sm'
                  tokenSymbol={tokenData.symbol}
                />
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className='flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-all duration-200'>
                  {isCollapsed ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronUp className='w-4 h-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Mobile Content */}
            {!isCollapsed && (
              <div className='max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600'>
                {/* Description */}
                {tokenData.description && (
                  <div className='p-3 border-b border-zinc-700/50'>
                    <p className='text-zinc-400 text-sm leading-relaxed line-clamp-3'>
                      {tokenData.description}
                    </p>
                  </div>
                )}

                {/* Social Links and Views - Mobile */}
                {(tokenData.websiteUrl ||
                  tokenData.twitterHandle ||
                  tokenData.telegramUrl ||
                  tokenData.viewsCount !== undefined) && (
                  <div className='p-3 border-b border-zinc-700/50'>
                    <div className='flex items-center justify-center gap-3'>
                      {/* Social Icons */}
                      {(tokenData.websiteUrl ||
                        tokenData.twitterHandle ||
                        tokenData.telegramUrl) && (
                        <div className='flex gap-2'>
                          {tokenData.websiteUrl && (
                            <WebsiteInfoTooltip websiteUrl={tokenData.websiteUrl} />
                          )}
                          {tokenData.twitterHandle && (
                            <TwitterHistoryTooltip
                              twitterHandle={tokenData.twitterHandle}
                              twitterHistory={tokenHistoryData}
                            />
                          )}
                          {tokenData.telegramUrl && (
                            <Link
                              href={tokenData.telegramUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'
                              title='Telegram'>
                              <MessageSquare className='w-4 h-4 text-blue-400' />
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Views */}
                      {tokenData.viewsCount !== undefined && (
                        <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50'>
                          <Eye className='w-4 h-4 text-blue-400' />
                          <span className='text-sm text-zinc-300'>Views</span>
                          <span className='text-sm font-medium text-white'>
                            {tokenData.viewsCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk Section - Mobile */}
                <div className='p-3 border-b border-zinc-700/50'>
                  {!isDev && riskData && !isLoadingRiskData ? (
                    <div className='space-y-2'>
                      <div
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-800/50 ${
                          riskData.risks && riskData.risks.length > 0
                            ? 'cursor-pointer hover:bg-zinc-700/50'
                            : ''
                        } transition-colors duration-200`}
                        onClick={() =>
                          riskData.risks &&
                          riskData.risks.length > 0 &&
                          setIsRiskCollapsed(!isRiskCollapsed)
                        }>
                        <Shield className='w-4 h-4 text-zinc-400' />
                        <span className='text-sm text-zinc-300'>Risk Score</span>
                        <div className='ml-auto flex items-center gap-2'>
                          <div
                            className={`text-sm font-bold px-2 py-1 rounded ${
                              riskData.score <= 3
                                ? 'text-emerald-300 bg-emerald-500/20'
                                : riskData.score <= 6
                                  ? 'text-amber-300 bg-amber-500/20'
                                  : 'text-red-300 bg-red-500/20'
                            }`}>
                            {riskData.score}/10
                          </div>
                          {riskData.risks && riskData.risks.length > 0 && (
                            <div>
                              {isRiskCollapsed ? (
                                <ChevronDown className='w-4 h-4 text-zinc-400' />
                              ) : (
                                <ChevronUp className='w-4 h-4 text-zinc-400' />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Risk Badges - Mobile */}
                      {riskData.risks && riskData.risks.length > 0 && !isRiskCollapsed && (
                        <div className='space-y-1.5'>
                          {riskData.risks.slice(0, 3).map((risk, index) => {
                            const displayName =
                              risk.name === 'No social media'
                                ? 'No original social media'
                                : risk.name;
                            return (
                              <div
                                key={index}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  risk.level === 'danger'
                                    ? 'text-red-300 bg-red-500/20 border border-red-500/30'
                                    : risk.level === 'warning'
                                      ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                                      : 'text-blue-300 bg-blue-500/20 border border-blue-500/30'
                                }`}>
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    risk.level === 'danger'
                                      ? 'bg-red-400'
                                      : risk.level === 'warning'
                                        ? 'bg-amber-400'
                                        : 'bg-blue-400'
                                  }`}
                                />
                                <span>{displayName}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-sm text-zinc-400 px-3 py-1.5 text-center'>
                      Risk analysis not available
                    </div>
                  )}
                </div>

                {/* Quick Actions - Mobile */}
                <div className='p-3 border-b border-zinc-700/50'>
                  <h3 className='text-sm font-semibold text-white mb-2'>Quick Actions</h3>
                  <div className='grid grid-cols-1 gap-2'>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tokenData.mintAddress);
                        toast({
                          title: 'Address copied',
                          description: 'Token address copied to clipboard',
                        });
                      }}
                      className='w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 hover:text-white transition-all duration-200 group cursor-pointer'>
                      <Copy className='w-4 h-4 text-blue-400 group-hover:text-blue-300' />
                      <span className='text-sm font-medium'>Copy Address</span>
                    </button>

                    <SolscanButton
                      address={tokenData.mintAddress}
                      type='token'
                      className='w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 hover:text-white transition-all duration-200 group cursor-pointer'>
                      <ExternalLink className='w-4 h-4 text-blue-400 group-hover:text-blue-300' />
                      <span className='text-sm font-medium'>View on Solscan</span>
                    </SolscanButton>
                  </div>
                </div>

                {/* Sentiment Section - Mobile */}
                {sentimentData && onSentimentVote && (
                  <div className='p-3 border-b border-zinc-700/50'>
                    <h3 className='text-sm font-semibold text-white mb-2'>Token Sentiment</h3>
                    <div className='grid grid-cols-3 gap-2'>
                      {/* Bullish Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg p-2 border ${
                          sentimentData?.userSentiment === SentimentType.BULLISH
                            ? 'border-green-500/50 bg-green-900/20'
                            : 'border-transparent hover:border-green-500/20 hover:bg-green-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => onSentimentVote(SentimentType.BULLISH)}>
                        <div className='text-lg mb-1'>🚀</div>
                        <div className='font-bold text-sm text-white'>
                          {sentimentData?.bullishCount || 0}
                        </div>
                      </div>

                      {/* Bearish Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg p-2 border ${
                          sentimentData?.userSentiment === SentimentType.BEARISH
                            ? 'border-red-500/50 bg-red-900/20'
                            : 'border-transparent hover:border-red-500/20 hover:bg-red-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => onSentimentVote(SentimentType.BEARISH)}>
                        <div className='text-lg mb-1'>💩</div>
                        <div className='font-bold text-sm text-white'>
                          {sentimentData?.bearishCount || 0}
                        </div>
                      </div>

                      {/* Red Flag Card */}
                      <div
                        className={`flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg p-2 border ${
                          sentimentData?.userSentiment === SentimentType.RED_FLAG
                            ? 'border-orange-500/50 bg-orange-900/20'
                            : 'border-transparent hover:border-yellow-500/20 hover:bg-yellow-900/10'
                        } transition-all duration-200 cursor-pointer ${
                          isVoting ? 'opacity-50 pointer-events-none' : ''
                        } transform hover:scale-105 active:scale-95`}
                        onClick={() => onSentimentVote(SentimentType.RED_FLAG)}>
                        <div className='text-lg mb-1'>🚩</div>
                        <div className='font-bold text-sm text-white'>
                          {sentimentData?.redFlagCount || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Input - Mobile */}
                <div className='p-3'>
                  <h3 className='text-sm font-semibold text-white mb-2'>Search Token</h3>
                  <div className='relative group'>
                    {/* Enhanced background glow effect */}
                    <div className='absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300'></div>

                    <form onSubmit={handleSearchSubmit} className='relative'>
                      <div className='relative'>
                        <Input
                          type='text'
                          value={searchAddress}
                          onChange={(e) => setSearchAddress(e.target.value)}
                          placeholder='Enter token address'
                          className='pr-12 h-10 border-zinc-600/50 bg-zinc-900/80 backdrop-blur-sm text-white placeholder:text-zinc-400 text-sm rounded-xl transition-all duration-200 focus:border-emerald-500/70 focus:bg-zinc-900/90 focus:ring-2 focus:ring-emerald-500/20'
                          disabled={isSearching}
                        />
                        <button
                          type='submit'
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center rounded-lg transition-all duration-200 ${
                            isSearching
                              ? 'opacity-70 cursor-not-allowed'
                              : 'hover:scale-105 cursor-pointer'
                          }`}
                          disabled={isSearching}>
                          {isSearching ? (
                            <svg
                              className='animate-spin h-3 w-3 text-white'
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
                            <Search className='h-3 w-3 text-white' />
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sidebar Layout */}
          <div className='hidden lg:block'>
            {/* Views Counter */}
            {tokenData.viewsCount !== undefined && (
              <div className='absolute top-5 left-4 z-10 flex items-center'>
                <div className='flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 h-6'>
                  <Eye className='w-3 h-3 text-blue-400' />
                  <span className='text-xs font-medium text-white'>
                    {tokenData.viewsCount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Bookmark Button */}
            <div className='absolute top-4 right-4 z-10'>
              <WatchlistButton
                mintAddress={tokenData.mintAddress}
                initialWatchlistStatus={tokenData.isWatchlisted}
                onStatusChange={() => {}}
                size='sm'
                tokenSymbol={tokenData.symbol}
              />
            </div>

            {/* Token Header Section */}
            <div className='p-6 pt-2 border-b border-zinc-700/50'>
              <div className='flex flex-col items-center text-center'>
                <div className='relative mb-6 mt-4'>
                  <div className='absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-xl blur-sm'></div>
                  <TokenImage
                    imageUrl={tokenData.imageUrl}
                    name={tokenData.name}
                    symbol={tokenData.symbol}
                    className='relative w-16 h-16 rounded-xl shadow-lg'
                  />
                </div>
                <div className='flex items-center gap-2 mb-1'>
                  <h1 className='text-xl font-bold text-white'>{tokenData.name}</h1>
                </div>
                <div className='mb-4'>
                  <span className='text-zinc-400 font-medium text-sm'>${tokenData.symbol}</span>
                </div>

                {/* Verify Ownership Button - Desktop */}
                {!tokenData.verifiedCreatorUserId &&
                  isAuthenticated &&
                  user &&
                  !isVerifyingCreator && (
                    <div className='mb-2'>
                      <button
                        onClick={onVerifyCreator}
                        disabled={isVerifyingCreator}
                        className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-600/30 hover:border-zinc-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'>
                        <Shield className='w-3 h-3' />
                        <span>Verify token ownership</span>
                      </button>
                    </div>
                  )}

                {tokenData.verifiedCreatorUserId && (
                  <div className='mb-2'>
                    {user?.id === tokenData.verifiedCreatorUserId ? (
                      <div className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30'>
                        <Shield className='w-3 h-3' />
                        <span>Verified Owner</span>
                      </div>
                    ) : tokenData.verifiedCreatorUser ? (
                      <Link
                        href={`/users/${tokenData.verifiedCreatorUser.username}`}
                        className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all duration-200 cursor-pointer text-xs font-medium'>
                        <Shield className='w-3 h-3' />
                        <span>Dev: @{tokenData.verifiedCreatorUser.username}</span>
                      </Link>
                    ) : (
                      <div className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-700/50 text-zinc-300 text-xs font-medium border border-zinc-600/30'>
                        <Shield className='w-3 h-3' />
                        <span>Dev Verified</span>
                      </div>
                    )}
                  </div>
                )}

                {isVerifyingCreator && (
                  <div className='flex items-center gap-1 mb-2'>
                    <svg
                      className='animate-spin h-3 w-3'
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
                    <span className='text-xs text-zinc-300'>Verifying...</span>
                  </div>
                )}

                {/* Description */}
                {tokenData.description && (
                  <div className='text-center'>
                    <p className='text-zinc-400 text-sm leading-relaxed line-clamp-3'>
                      {tokenData.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links Section - Only show if there are actual social links */}
            {(tokenData.websiteUrl || tokenData.twitterHandle || tokenData.telegramUrl) && (
              <div className='p-6 border-b border-zinc-700/50'>
                <div className='flex items-center justify-center gap-3'>
                  <div className='flex gap-2'>
                    {tokenData.websiteUrl && (
                      <WebsiteInfoTooltip websiteUrl={tokenData.websiteUrl} />
                    )}
                    {tokenData.twitterHandle && (
                      <TwitterHistoryTooltip
                        twitterHandle={tokenData.twitterHandle}
                        twitterHistory={tokenHistoryData}
                      />
                    )}
                    {tokenData.telegramUrl && (
                      <Link
                        href={tokenData.telegramUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'
                        title='Telegram'>
                        <MessageSquare className='w-4 h-4 text-blue-400' />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Risk Section */}
            <div className='p-6 border-b border-zinc-700/50'>
              {/* Risk Score */}
              {!isDev && riskData && !isLoadingRiskData ? (
                <div className='space-y-4'>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 ${
                      riskData.risks && riskData.risks.length > 0
                        ? 'cursor-pointer hover:bg-zinc-700/50'
                        : ''
                    } transition-colors duration-200`}
                    onClick={() =>
                      riskData.risks &&
                      riskData.risks.length > 0 &&
                      setIsRiskCollapsed(!isRiskCollapsed)
                    }>
                    <Shield className='w-4 h-4 text-zinc-400' />
                    <span className='text-sm text-zinc-300'>Risk Score</span>
                    <div className='ml-auto flex items-center gap-2'>
                      <div
                        className={`text-sm font-bold px-2 py-1 rounded ${
                          riskData.score <= 3
                            ? 'text-emerald-300 bg-emerald-500/20'
                            : riskData.score <= 6
                              ? 'text-amber-300 bg-amber-500/20'
                              : 'text-red-300 bg-red-500/20'
                        }`}>
                        {riskData.score}/10
                      </div>
                      {riskData.risks && riskData.risks.length > 0 && (
                        <div>
                          {isRiskCollapsed ? (
                            <ChevronDown className='w-4 h-4 text-zinc-400' />
                          ) : (
                            <ChevronUp className='w-4 h-4 text-zinc-400' />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Risk Badges */}
                  {riskData.risks && riskData.risks.length > 0 && !isRiskCollapsed && (
                    <div className='space-y-2'>
                      {riskData.risks.map((risk, index) => {
                        const displayName =
                          risk.name === 'No social media' ? 'No original social media' : risk.name;
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                              risk.level === 'danger'
                                ? 'text-red-300 bg-red-500/20 border border-red-500/30'
                                : risk.level === 'warning'
                                  ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                                  : 'text-blue-300 bg-blue-500/20 border border-blue-500/30'
                            }`}>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                risk.level === 'danger'
                                  ? 'bg-red-400'
                                  : risk.level === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-blue-400'
                              }`}
                            />
                            <span>{displayName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-sm text-zinc-400 px-3 py-2 text-center'>
                  Risk analysis not available
                </div>
              )}
            </div>

            {/* Quick Actions Section */}
            <div className='p-6'>
              <h3 className='text-sm font-semibold text-white mb-3'>Quick Actions</h3>
              <div className='space-y-2'>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tokenData.mintAddress);
                    toast({
                      title: 'Address copied',
                      description: 'Token address copied to clipboard',
                    });
                  }}
                  className='w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 hover:text-white transition-all duration-200 group cursor-pointer'>
                  <Copy className='w-4 h-4 text-blue-400 group-hover:text-blue-300' />
                  <span className='text-sm font-medium'>Copy Address</span>
                </button>

                <SolscanButton
                  address={tokenData.mintAddress}
                  type='token'
                  className='w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 hover:text-white transition-all duration-200 group cursor-pointer'>
                  <ExternalLink className='w-4 h-4 text-blue-400 group-hover:text-blue-300' />
                  <span className='text-sm font-medium'>View on Solscan</span>
                </SolscanButton>

                <button
                  onClick={onShowEmbedDialog}
                  className='w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200 hover:text-white transition-all duration-200 group cursor-pointer'>
                  <Code className='w-4 h-4 text-blue-400 group-hover:text-blue-300' />
                  <span className='text-sm font-medium'>Embed Widget</span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className='flex flex-col items-center justify-center h-full p-6 text-center'>
          <h2 className='text-lg font-semibold text-red-400 mb-2'>Token not found</h2>
          <p className='text-zinc-400 text-sm'>
            The token you&apos;re looking for could not be found.
          </p>
        </div>
      )}
    </div>
  );
});
