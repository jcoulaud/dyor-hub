import { WalletBadge } from '@/components/wallet/WalletBadge';
import { users, wallets } from '@/lib/api';
import type { User, UserActivity } from '@dyor-hub/types';
import { MessageSquare, Reply, ThumbsDown, ThumbsUp, Twitter } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity } from './Activity';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  try {
    const { username } = await params;
    const user = await users.getByUsername(username);
    return {
      title: `${user.displayName} (@${user.username})`,
      description: `Profile page for ${user.displayName} (@${user.username})`,
      openGraph: {
        title: `${user.displayName} (@${user.username})`,
        description: `Profile page for ${user.displayName} (@${user.username})`,
        images: [
          {
            url: `/users/${username}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `${user.displayName} - DYOR hub Profile`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${user.displayName} (@${user.username})`,
        description: `Profile page for ${user.displayName} (@${user.username})`,
        images: [`/users/${username}/opengraph-image`],
      },
    };
  } catch {
    return {
      title: 'User Not Found',
      description: 'This user profile could not be found',
    };
  }
}

export type UserComment = UserActivity;

// Server component that fetches the data and renders the client component
export default async function UserProfilePage({ params }: UserPageProps) {
  let user: User;

  try {
    const { username } = await params;
    user = await users.getByUsername(username);

    const userStats = await users.getUserStats(username);
    const userActivities = await users.getUserActivity(username, 1, 10);
    const userComments = userActivities.data;

    let walletInfo = null;
    try {
      walletInfo = await wallets.getPublicInfo(user.id);
    } catch {
      // Continue without wallet info
    }

    const avatarUrl = user.avatarUrl ? user.avatarUrl.replace('_normal', '') : null;

    const totalActivities =
      userStats.comments + userStats.replies + userStats.upvotes + userStats.downvotes;

    return (
      <div className='min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black'>
        {/* Page background elements */}
        <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 blur-xl'></div>

        <div className='container mx-auto px-4 py-12 relative z-10'>
          <div className='max-w-4xl mx-auto'>
            {/* Integrated Header Card - Reduced size */}
            <div className='mb-10 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl'>
              {/* Top Section: Avatar, Name, Twitter */}
              <div className='p-6 pb-4 relative'>
                {/* Background glow effect */}
                <div className='absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10 blur-xl'></div>

                <div className='flex flex-col md:flex-row md:items-center gap-4'>
                  {/* Avatar - Slightly smaller */}
                  <div className='w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 shadow-xl relative mx-auto md:mx-0'>
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={user.displayName}
                        fill
                        sizes='80px'
                        className='object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600'>
                        <span className='text-2xl font-bold text-white'>
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className='text-center md:text-left flex-1'>
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between'>
                      <div>
                        <h1 className='text-2xl font-bold text-white'>{user.displayName}</h1>
                        <p className='text-zinc-400 text-sm'>@{user.username}</p>
                      </div>

                      <div className='flex flex-col md:flex-row items-center gap-3 mt-3 md:mt-0'>
                        <div className='flex items-center gap-2'>
                          {walletInfo && walletInfo.isVerified && (
                            <WalletBadge
                              address={walletInfo.address}
                              isVerified={walletInfo.isVerified}
                            />
                          )}

                          <Link
                            href={`https://twitter.com/${user.username}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200'
                            title='Twitter'>
                            <Twitter className='h-4 w-4 text-blue-400' />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Stats */}
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

            {/* Activity Section */}
            <Activity
              initialComments={userComments}
              totalActivities={totalActivities}
              username={username}
            />
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
