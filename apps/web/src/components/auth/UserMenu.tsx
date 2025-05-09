'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { useModal } from '@/providers/modal-provider';
import {
  Bookmark,
  LogOut,
  Settings,
  Shield,
  UserCircle,
  UserCog,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

export function UserMenu() {
  const { isAuthenticated, user, clearAuth } = useAuthContext();
  const { openAuthModal } = useModal();
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

  const handleOpenLoginModal = () => {
    openAuthModal();
  };

  if (!isAuthenticated || !user) {
    return (
      <Button variant='outline' onClick={handleOpenLoginModal} className='h-10 px-4 py-2'>
        Sign In
      </Button>
    );
  }

  // Get high-res avatar URL
  const highResAvatarUrl = getHighResAvatar(user.avatarUrl);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoggingOut}>
        <Button
          variant='ghost'
          className='relative h-10 w-10 rounded-full overflow-hidden border border-white/10 transition-all duration-200 hover:shadow-sm bg-zinc-900/50 backdrop-blur-sm cursor-pointer'>
          <Avatar className='h-9 w-9 transition-transform duration-200 group-hover:scale-105'>
            <AvatarImage src={highResAvatarUrl} alt={user.displayName} />
            <AvatarFallback className='bg-gradient-to-br from-blue-600/80 to-purple-600/80'>
              <UserIcon className='h-5 w-5 text-white' />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-64 md:w-64 w-52 p-0 overflow-hidden border border-white/10 bg-black shadow-xl rounded-xl'>
        <div className='bg-gradient-to-r from-blue-950/50 to-purple-950/50 p-4 md:p-4 p-3 border-b border-white/10'>
          <div className='flex items-center gap-3'>
            <Avatar className='md:h-12 md:w-12 h-10 w-10 border-2 border-white/10 shadow-md'>
              <AvatarImage src={highResAvatarUrl} alt={user.displayName} />
              <AvatarFallback className='bg-gradient-to-br from-blue-600/80 to-purple-600/80'>
                <UserIcon className='md:h-6 md:w-6 h-5 w-5 text-white' />
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
            <DropdownMenuItem className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
              <UserCircle className='h-4 w-4' />
              <span>Public Profile</span>
            </DropdownMenuItem>
          </Link>

          <Link href='/watchlist'>
            <DropdownMenuItem className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
              <Bookmark className='h-4 w-4' />
              <span>Watchlist</span>
            </DropdownMenuItem>
          </Link>

          <Link href='/account/profile'>
            <DropdownMenuItem className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
              <UserCog className='h-4 w-4' />
              <span>Account</span>
            </DropdownMenuItem>
          </Link>

          <Link href='/settings'>
            <DropdownMenuItem className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
              <Settings className='h-4 w-4' />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>

          {user.isAdmin && (
            <>
              <DropdownMenuSeparator className='my-1 bg-white/10' />
              <Link href='/admin'>
                <DropdownMenuItem className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-emerald-500 hover:text-emerald-400 focus:text-emerald-400 cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                  <Shield className='h-4 w-4' />
                  <span>Admin Dashboard</span>
                </DropdownMenuItem>
              </Link>
            </>
          )}

          <DropdownMenuSeparator className='my-1 bg-white/10' />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className='flex items-center gap-2 md:px-3 md:py-2.5 px-2.5 py-2 text-sm text-red-500 hover:text-red-400 focus:text-red-400 cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
            <LogOut className='h-4 w-4' />
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
