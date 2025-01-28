'use client';

import Link from 'next/link';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-14 items-center'>
        <div className='mr-4 flex'>
          <Link href='/'>
            <span className='mr-6 flex items-center space-x-2'>
              <span className='font-bold sm:inline-block'>DYOR Hub</span>
            </span>
          </Link>
        </div>
        <div className='flex flex-1 items-center justify-between space-x-2 md:justify-end'>
          <div className='w-full flex-1 md:w-auto md:flex-none'></div>
          <nav className='flex items-center'>
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
