import { UserProfileTokenCallsStats } from '@/components/profile/UserProfileTokenCallsStats';
import { users } from '@/lib/api';
import type { User as BaseUser, UserActivity, UserStats } from '@dyor-hub/types';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Activity } from './Activity';
import { UserProfileHeaderClient } from './components/UserProfileHeaderClient';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

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

export interface User extends BaseUser {
  followersCount?: number;
  followingCount?: number;
  createdTokens?: BaseUser['createdTokens'];
}

// Server component that fetches the data and renders the client component
export default async function UserProfilePage({ params }: UserPageProps) {
  let user: User;

  try {
    const { username } = await params;
    try {
      user = await users.getByUsername(username);
    } catch (error) {
      console.error(`Failed to fetch user ${username}:`, error);
      notFound();
    }

    // Fetch stats with error handling
    let userStats: UserStats = {
      comments: 0,
      replies: 0,
      upvotes: 0,
      downvotes: 0,
      currentStreak: 0,
      longestStreak: 0,
      reputation: 0,
    };

    try {
      userStats = await users.getUserStats(username);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Use default values from initialization
    }

    // Fetch activities with error handling
    let userComments: UserActivity[] = [];
    let totalActivities = 0;

    try {
      const userActivities = await users.getUserActivity(username, 1, 10);
      userComments = userActivities.data;
      totalActivities =
        userStats.comments + userStats.replies + userStats.upvotes + userStats.downvotes;
    } catch (error) {
      console.error('Error fetching user activities:', error);
    }

    return (
      <div className='min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black'>
        {/* Page background elements */}
        <div className='absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 blur-xl'></div>

        <div className='container mx-auto px-4 py-12 relative z-10'>
          <div className='max-w-4xl mx-auto'>
            <UserProfileHeaderClient profileUser={user} userStats={userStats} />

            {/* Token Call Stats Section */}
            <UserProfileTokenCallsStats userId={user.id} username={user.username} />

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
  } catch (error) {
    console.error('Error rendering user profile page:', error);
    notFound();
  }
}
