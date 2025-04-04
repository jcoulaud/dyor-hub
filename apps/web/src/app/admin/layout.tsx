'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BadgeCheck, BarChart3, Flame, Medal, Settings, ShieldCheck, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
  },
  {
    title: 'Badges',
    href: '/admin/badges',
    icon: BadgeCheck,
  },
  {
    title: 'Streaks',
    href: '/admin/streaks',
    icon: Flame,
  },
  {
    title: 'Reputation',
    href: '/admin/reputation',
    icon: Medal,
  },
  {
    title: 'Leaderboard',
    href: '/admin/leaderboard',
    icon: Trophy,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className='flex min-h-screen flex-col'>
        <div className='flex flex-1'>
          {/* Sidebar Navigation */}
          <aside className='hidden w-64 flex-col border-r border-zinc-800/50 bg-black/70 md:flex'>
            <div className='flex h-14 items-center border-b border-zinc-800/50 px-4'>
              <Link
                href='/admin'
                className='flex items-center gap-2 font-semibold text-emerald-500'>
                <ShieldCheck className='h-5 w-5' />
                <span>Admin Dashboard</span>
              </Link>
            </div>
            <nav className='flex-1 overflow-auto p-4'>
              <div className='space-y-2'>
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant='ghost'
                    className={cn(
                      'w-full justify-start',
                      pathname === item.href
                        ? 'bg-zinc-800/50 text-white'
                        : 'text-zinc-400 hover:text-white',
                    )}
                    asChild>
                    <Link href={item.href} className='flex items-center'>
                      <item.icon className='mr-2 h-5 w-5' />
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </div>
            </nav>
          </aside>

          {/* Mobile Navigation */}
          <div className='flex w-full flex-col md:hidden border-b border-zinc-800/50 bg-black/80'>
            <div className='flex h-14 items-center px-4'>
              <Link
                href='/admin'
                className='flex items-center gap-2 font-semibold text-emerald-500'>
                <ShieldCheck className='h-5 w-5' />
                <span>Admin Dashboard</span>
              </Link>
            </div>
            <div className='flex space-x-1 overflow-auto p-2'>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant='ghost'
                  size='sm'
                  className={cn(
                    'flex-shrink-0',
                    pathname === item.href
                      ? 'bg-zinc-800/50 text-white'
                      : 'text-zinc-400 hover:text-white',
                  )}
                  asChild>
                  <Link href={item.href} className='flex items-center'>
                    <item.icon className='mr-2 h-4 w-4' />
                    <span className='truncate'>{item.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <main className='flex-1 overflow-auto p-4 md:p-6'>{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
