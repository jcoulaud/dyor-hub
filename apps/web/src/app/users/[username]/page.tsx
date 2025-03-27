import { users } from '@/lib/api';
import type { User } from '@dyor-hub/types';
import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

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

export default async function UserProfilePage({ params }: UserPageProps) {
  let user: User;

  try {
    user = await users.getByUsername(params.username);
  } catch {
    notFound();
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-2xl mx-auto'>
        <div className='flex items-center space-x-4 mb-6'>
          <div className='w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-800/50 shadow-md relative'>
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                fill
                sizes='80px'
                className='object-cover'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600/80 to-purple-600/80'>
                <span className='text-2xl font-bold text-white'>
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <h1 className='text-2xl font-bold'>{user.displayName}</h1>
            <p className='text-zinc-400'>@{user.username}</p>
          </div>
        </div>

        <div className='bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6'>
          <h2 className='text-xl font-medium mb-4'>Profile Information</h2>
          <p className='text-zinc-300'>
            This is {user.displayName}&apos;s profile page. We&apos;ll be adding more features here
            soon.
          </p>
        </div>
      </div>
    </div>
  );
}
