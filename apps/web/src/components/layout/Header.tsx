'use client';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import {
  BarChart2,
  BookOpen,
  DollarSign,
  Home,
  Link as LinkIcon,
  Menu,
  Trophy,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { UserMenu } from '../auth/UserMenu';
import { TopBanner } from './TopBanner';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthContext();

  return (
    <header className='sticky top-0 z-50 w-full border-b border-white/10 bg-black backdrop-blur-xl'>
      <div className='w-full px-0 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center px-4 sm:px-0'>
          <div className='w-[140px]'>
            <Link href='/'>
              <div className='flex items-center'>
                <Image src='/logo.png' alt='DYOR hub' width={140} height={50} priority />
              </div>
            </Link>
          </div>
          <div className='flex-1 flex items-center justify-center'>
            {/* Desktop Navigation */}
            <nav className='hidden md:flex items-center space-x-4'>
              <Link
                href='/'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-gradient-to-r from-blue-600/90 to-blue-800/90 hover:from-blue-500/90 hover:to-blue-700/90 border border-white/10 shadow-md hover:shadow-blue-900/20 hover:scale-[1.02]'>
                Home
              </Link>
              <Link
                href='/leaderboard'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-gradient-to-r from-amber-600/90 to-orange-700/90 hover:from-amber-500/90 hover:to-orange-600/90 border border-white/10 shadow-md hover:shadow-orange-900/20 hover:scale-[1.02]'>
                Leaderboard
              </Link>
              <Link
                href='/links'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-gradient-to-r from-purple-600/90 to-indigo-800/90 hover:from-purple-500/90 hover:to-indigo-700/90 border border-white/10 shadow-md hover:shadow-indigo-900/20 hover:scale-[1.02]'>
                Official Links
              </Link>
              <Link
                href='/token-calls'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-gradient-to-r from-green-600/90 to-emerald-700/90 hover:from-green-500/90 hover:to-emerald-600/90 border border-white/10 shadow-md hover:shadow-emerald-900/20 hover:scale-[1.02]'>
                Token Calls
              </Link>
              <Link
                href='/faq'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-gradient-to-r from-pink-600/90 to-rose-700/90 hover:from-pink-500/90 hover:to-rose-600/90 border border-white/10 shadow-md hover:shadow-rose-900/20 hover:scale-[1.02]'>
                FAQ
              </Link>
              <a
                href={`https://dexscreener.com/solana/${CONTRACT_ADDRESS}`}
                target='_blank'
                rel='noopener noreferrer'
                className='px-4 py-2 text-sm font-medium text-white hover:text-white/90 transition-all duration-200 rounded-full bg-green-600 hover:bg-green-500 border border-white/10 shadow-md hover:shadow-green-500/30 hover:scale-[1.02]'>
                Buy Token
              </a>
            </nav>
          </div>
          <div className='min-w-[140px] flex items-center justify-end space-x-2'>
            {/* Mobile Menu Button */}
            <div className='md:hidden relative'>
              <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-9 w-9 text-zinc-400 hover:text-white'>
                    {isMobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                    <span className='sr-only'>Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align='end'
                  className='w-52 p-1 overflow-hidden border border-white/10 bg-black shadow-xl rounded-xl mt-2'
                  sideOffset={4}>
                  <Link
                    href='/'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                    <Home className='h-4 w-4' />
                    <span>Home</span>
                  </Link>
                  <Link
                    href='/leaderboard'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                    <Trophy className='h-4 w-4' />
                    <span>Leaderboard</span>
                  </Link>
                  <Link
                    href='/links'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                    <LinkIcon className='h-4 w-4' />
                    <span>Official Links</span>
                  </Link>
                  <Link
                    href='/token-calls'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                    <BarChart2 className='h-4 w-4' />
                    <span>Token Calls</span>
                  </Link>
                  <Link
                    href='/faq'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg hover:bg-zinc-800 focus:bg-zinc-800 transition-colors'>
                    <BookOpen className='h-4 w-4' />
                    <span>FAQ</span>
                  </Link>
                  <a
                    href={`https://dexscreener.com/solana/${CONTRACT_ADDRESS}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-lg bg-green-600 hover:bg-green-500 transition-colors'>
                    <DollarSign className='h-4 w-4' />
                    <span>Buy Token</span>
                  </a>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isAuthenticated && <NotificationBell />}
            <UserMenu />
          </div>
        </div>
      </div>
      <TopBanner />
    </header>
  );
}
