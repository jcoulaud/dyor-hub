'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          <div>
            <Link href='/'>
              <div className='flex items-center'>
                <Image
                  src='/logo.png'
                  alt='DYOR hub'
                  width={140}
                  height={40}
                  className='h-auto w-auto'
                  priority
                />
              </div>
            </Link>
          </div>
          <div className='flex items-center space-x-4'>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
