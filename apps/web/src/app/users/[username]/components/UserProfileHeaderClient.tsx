'use client';

import { ProfileStats } from '@/components/profile/ProfileStats';
import { ShareButton } from '@/components/share/ShareButton';
import { TwitterShareButton } from '@/components/share/TwitterShareButton';
import { TipButton } from '@/components/tipping/TipButton';
import { FollowButton } from '@/components/user/FollowButton';
import { WalletBadge } from '@/components/wallet/WalletBadge';
import { getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { User, UserStats } from '@dyor-hub/types';
import { MessageSquare, Reply, Shield, ThumbsDown, ThumbsUp, Twitter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface UserProfileHeaderClientProps {
  profileUser: User & {
    followersCount?: number;
    followingCount?: number;
    primaryWalletAddress?: string;
    preferences?: { showWalletAddress?: boolean };
    createdTokens?: { mintAddress: string; symbol: string }[];
  };
  userStats: UserStats;
}

export function UserProfileHeaderClient({ profileUser, userStats }: UserProfileHeaderClientProps) {
  const { user: loggedInUser, isAuthenticated } = useAuthContext();
  const avatarUrl = getHighResAvatar(profileUser.avatarUrl) || null;

  const shouldRenderTipButton =
    isAuthenticated && loggedInUser && profileUser && loggedInUser.id !== profileUser.id;

  return (
    <div className='mb-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl'>
      {/* Top Section: Avatar, Name, Twitter */}
      <div className='p-6 pb-4 relative'>
        <div className='absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10 blur-xl'></div>
        <div className='flex flex-col md:flex-row md:items-start gap-4'>
          <div className='w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 shadow-xl relative mx-auto md:mx-0 md:mt-1'>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={profileUser.displayName}
                fill
                sizes='80px'
                className='object-cover'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600'>
                <span className='text-2xl font-bold text-white'>
                  {profileUser.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className='text-center md:text-left flex-1 max-w-full'>
            <div className='flex flex-col md:flex-row md:items-start md:justify-between'>
              <div className='flex-1 max-w-full'>
                <div className='flex items-center gap-1 mb-1 md:hidden justify-center w-full'>
                  <ShareButton />
                  <TwitterShareButton
                    displayName={profileUser.displayName}
                    userId={profileUser.id}
                  />
                </div>
                <div className='flex flex-col items-center md:items-start max-w-full'>
                  <h1 className='text-2xl font-bold text-white flex items-center gap-2 flex-wrap'>
                    {profileUser.displayName}
                    <div className='hidden md:flex items-center gap-1'>
                      <ShareButton />
                      <TwitterShareButton
                        displayName={profileUser.displayName}
                        userId={profileUser.id}
                      />
                      {profileUser.createdTokens && profileUser.createdTokens.length > 0 && (
                        <div className='flex items-center gap-1.5 ml-1.5'>
                          {profileUser.createdTokens?.map((token) => {
                            if (!token) return null;
                            return (
                              <Link
                                href={`/tokens/${token.mintAddress}`}
                                key={token.mintAddress}
                                className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-emerald-600/30 to-green-600/20 text-green-300 border border-green-500/20 hover:border-green-400/40 hover:from-emerald-600/40 hover:to-green-600/30 transition-all duration-300 shadow-sm shadow-green-900/20 backdrop-blur-md'
                                title={`Verified creator of $${token.symbol.toUpperCase()}`}>
                                <Shield className='h-3 w-3 text-green-300 drop-shadow-md' />
                                <span className='flex items-center'>
                                  <span className='text-green-300/80 mr-0.5'>$</span>
                                  <span className='font-semibold'>
                                    {token.symbol.toUpperCase()}
                                  </span>
                                  <span className='ml-1 text-green-300/90'>team</span>
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </h1>
                  <p className='text-zinc-400 text-sm'>@{profileUser.username}</p>
                  {typeof profileUser.followersCount === 'number' &&
                    typeof profileUser.followingCount === 'number' && (
                      <div className='flex items-center gap-2 mt-1'>
                        <Link
                          href={`/users/${profileUser.username}/followers`}
                          className='text-xs text-zinc-400 font-medium hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition'>
                          {profileUser.followersCount} Follower
                          {profileUser.followersCount !== 1 ? 's' : ''}
                        </Link>
                        <span className='text-zinc-500'>·</span>
                        <Link
                          href={`/users/${profileUser.username}/following`}
                          className='text-xs text-zinc-400 font-medium hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition'>
                          {profileUser.followingCount} Following
                        </Link>
                      </div>
                    )}

                  {profileUser.bio && (
                    <div className='mt-3 max-w-3xl'>
                      <p className='text-sm text-zinc-300/90 text-center md:text-left'>
                        {profileUser.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-3 mt-3 md:mt-1 mx-auto md:mx-0'>
                {profileUser.preferences?.showWalletAddress && profileUser.primaryWalletAddress && (
                  <WalletBadge address={profileUser.primaryWalletAddress} isVerified={true} />
                )}
                {isAuthenticated && loggedInUser?.id !== profileUser.id && (
                  <FollowButton
                    profileUserId={profileUser.id}
                    profileUserDisplayName={profileUser.displayName}
                  />
                )}
                {shouldRenderTipButton && (
                  <TipButton
                    recipientUserId={profileUser.id}
                    recipientUsername={profileUser.displayName}
                    contentType='profile'
                    contentId={profileUser.id}
                    size='sm'
                    className='flex items-center justify-center h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-amber-500/30 transition-all duration-200'
                  />
                )}
                <Link
                  href={`https://twitter.com/${profileUser.username}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                  title='Twitter'>
                  <Twitter className='h-4 w-4 text-blue-400' />
                </Link>
              </div>
            </div>
            <ProfileStats userId={profileUser.id} />
          </div>
        </div>
      </div>

      {/* User Stats Grid */}
      <div className='border-t border-white/5 bg-gradient-to-r from-zinc-900/30 via-zinc-900/20 to-zinc-900/30'>
        <div className='grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/5'>
          <div className='flex flex-col items-center py-4'>
            <div className='text-lg font-bold text-white'>{userStats.comments}</div>
            <div className='flex items-center gap-1.5 text-zinc-400 text-xs'>
              <MessageSquare className='h-3.5 w-3.5 text-blue-400' />
              <span>Comments</span>
            </div>
          </div>
          <div className='flex flex-col items-center py-4'>
            <div className='text-lg font-bold text-white'>{userStats.replies}</div>
            <div className='flex items-center gap-1.5 text-zinc-400 text-xs'>
              <Reply className='h-3.5 w-3.5 text-purple-400' />
              <span>Replies</span>
            </div>
          </div>
          <div className='flex flex-col items-center py-4'>
            <div className='text-lg font-bold text-white'>{userStats.upvotes}</div>
            <div className='flex items-center gap-1.5 text-zinc-400 text-xs'>
              <ThumbsUp className='h-3.5 w-3.5 text-green-400' />
              <span>Upvotes</span>
            </div>
          </div>
          <div className='flex flex-col items-center py-4'>
            <div className='text-lg font-bold text-white'>{userStats.downvotes}</div>
            <div className='flex items-center gap-1.5 text-zinc-400 text-xs'>
              <ThumbsDown className='h-3.5 w-3.5 text-red-400' />
              <span>Downvotes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
