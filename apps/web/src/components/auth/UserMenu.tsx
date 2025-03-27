'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { LogOut, User, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { TwitterLoginButton } from './TwitterLoginButton';

export function UserMenu() {
  const { isAuthenticated, user, clearAuth } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await auth.logout();
      clearAuth();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [clearAuth]);

  if (!isAuthenticated || !user) {
    return <TwitterLoginButton />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoggingOut}>
        <Button
          variant='ghost'
          className='relative h-10 w-10 rounded-full overflow-hidden border border-zinc-800/50 transition-all duration-200 hover:shadow-sm bg-zinc-900/50 backdrop-blur-sm cursor-pointer'>
          <Avatar className='h-9 w-9 transition-transform duration-200 group-hover:scale-105'>
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            <AvatarFallback className='bg-gradient-to-br from-blue-600/80 to-purple-600/80'>
              <User className='h-5 w-5 text-white' />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-64 p-0 overflow-hidden border border-zinc-800/50 bg-black shadow-xl rounded-xl'>
        <div className='bg-gradient-to-r from-blue-950/50 to-purple-950/50 p-4 border-b border-zinc-800/50'>
          <div className='flex items-center gap-3'>
            <Avatar className='h-12 w-12 border-2 border-zinc-800/50 shadow-md'>
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback className='bg-gradient-to-br from-blue-600/80 to-purple-600/80'>
                <User className='h-6 w-6 text-white' />
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
              <p className='text-sm font-medium text-white'>{user.displayName}</p>
              <p className='text-xs text-zinc-400'>@{user.username}</p>
            </div>
          </div>
        </div>

        <div className='p-1'>
          <Link href={`/users/${user.username}`}>
            <DropdownMenuItem className='flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
              <UserCircle className='h-4 w-4' />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className='flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:text-red-400 focus:text-red-400 cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
            <LogOut className='h-4 w-4' />
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
