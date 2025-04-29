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
import { MessageSquare, Reply, ThumbsDown, ThumbsUp, Twitter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface UserProfileHeaderClientProps {
  profileUser: User & {
    followersCount?: number;
    followingCount?: number;
    primaryWalletAddress?: string;
    preferences?: { showWalletAddress?: boolean };
  };
  userStats: UserStats;
}

export function UserProfileHeaderClient({ profileUser, userStats }: UserProfileHeaderClientProps) {
  const { user: loggedInUser, isAuthenticated } = useAuthContext();
  const avatarUrl = getHighResAvatar(profileUser.avatarUrl) || null;

  const shouldRenderTipButton =
    isAuthenticated && loggedInUser && profileUser && loggedInUser.id !== profileUser.id;
  console.log('[UserProfileHeaderClient] Should render TipButton:', shouldRenderTipButton, {
    isAuthenticated,
    loggedInUserId: loggedInUser?.id,
    profileUserId: profileUser?.id,
  });

  return (
    <div className='mb-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl'>
      {/* Top Section: Avatar, Name, Twitter */}
      <div className='p-6 pb-4 relative'>
        <div className='absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10 blur-xl'></div>
        <div className='flex flex-col md:flex-row md:items-center gap-4'>
          <div className='w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 shadow-xl relative mx-auto md:mx-0'>
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
          <div className='text-center md:text-left flex-1'>
            <div className='flex flex-col md:flex-row md:items-start md:justify-between'>
              <div>
                <div className='flex items-center gap-1 mb-1 md:hidden justify-center w-full'>
                  <ShareButton />
                  <TwitterShareButton
                    displayName={profileUser.displayName}
                    userId={profileUser.id}
                  />
                </div>
                <div className='flex flex-col items-center md:items-start'>
                  <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
                    {profileUser.displayName}
                    <div className='hidden md:flex items-center gap-1'>
                      <ShareButton />
                      <TwitterShareButton
                        displayName={profileUser.displayName}
                        userId={profileUser.id}
                      />
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
                </div>
              </div>
              <div className='flex items-center gap-3 mt-3 md:mt-1 mx-auto md:mx-0'>
                {profileUser.preferences?.showWalletAddress && profileUser.primaryWalletAddress && (
                  <WalletBadge address={profileUser.primaryWalletAddress} isVerified={true} />
                )}
                {/* Conditional Follow Button */}
                {isAuthenticated && loggedInUser?.id !== profileUser.id && (
                  <FollowButton
                    profileUserId={profileUser.id}
                    profileUserDisplayName={profileUser.displayName}
                  />
                )}
                {/* Conditional Tip Button */}
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
            {/* ProfileStats */}
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
