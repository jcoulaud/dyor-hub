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
import { LogOut, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { TwitterLoginButton } from './TwitterLoginButton';

export function UserMenu() {
  const { isAuthenticated, user, checkAuth } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await auth.logout();
      await checkAuth();
    } catch (error) {
      // Error is handled by setting isLoggingOut to false
    } finally {
      setIsLoggingOut(false);
    }
  }, [checkAuth]);

  if (!isAuthenticated || !user) {
    return <TwitterLoginButton />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoggingOut}>
        <Button variant='ghost' className='relative h-10 w-10 rounded-full'>
          <Avatar className='h-10 w-10'>
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            <AvatarFallback>
              <User className='h-6 w-6' />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <div className='flex items-center justify-start gap-2 p-2'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{user.displayName}</p>
            <p className='text-xs leading-none text-muted-foreground'>@{user.username}</p>
          </div>
        </div>
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className='text-red-600 focus:text-red-600 cursor-pointer'>
          <LogOut className='mr-2 h-4 w-4' />
          <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
