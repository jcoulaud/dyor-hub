import { users } from '@/lib/api';
import type { User } from '@dyor-hub/types';
import { MessageSquare, Reply, ThumbsDown, ThumbsUp, Twitter } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActivitySection } from './ActivitySection';
import { fetchUserComments } from './fetchUserComments';
import { fetchUserStats } from './fetchUserStats';

interface UserPageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  try {
    const user = await users.getByUsername(params.username);
    return {
      title: `${user.displayName} (@${user.username})`,
      description: `Profile page for ${user.displayName} (@${user.username})`,
    };
  } catch {
    return {
      title: 'User Not Found',
      description: 'This user profile could not be found',
    };
  }
}

// Add this interface for comment type
export interface UserComment {
  id: string;
  content: string;
  tokenMintAddress: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  tokenSymbol: string;
  isReply: boolean;
  isUpvote?: boolean;
  isDownvote?: boolean;
  parentCommentId: string | null;
}

// Server component that fetches the data and renders the client component
export default async function UserProfilePage({ params }: UserPageProps) {
  let user: User;

  try {
    user = await users.getByUsername(params.username);

    // In a real implementation, these would be API calls
    const userStats = await fetchUserStats(user.id);
    const userComments = await fetchUserComments(user.id);

    // Improve avatar image quality by removing "_normal" from URL if present
    const avatarUrl = user.avatarUrl ? user.avatarUrl.replace('_normal', '') : null;

    // For a real implementation, this would be done server-side with proper pagination
    // Here we'll just simulate the "most recent" 5 comments for display
    const recentComments = userComments.slice(0, 5);
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

                      {/* Twitter link - use Next.js Link with passHref for better reliability */}
                      <Link
                        href={`https://twitter.com/${user.username}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='relative z-20 cursor-pointer mt-3 mb-2 md:my-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors mx-auto md:mx-0 text-sm shadow-md'>
                        <Twitter className='h-4 w-4 text-white' />
                        <span className='text-white font-medium whitespace-nowrap'>Twitter</span>
                      </Link>
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

            {/* Client-side Activity Section with interactive controls */}
            <ActivitySection comments={recentComments} totalActivities={totalActivities} />
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
