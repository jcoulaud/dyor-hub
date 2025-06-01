import { CopyButton } from '@/components/CopyButton';
import { CONTRACT_ADDRESS, DISCORD_URL, TELEGRAM_URL } from '@/lib/constants';
import { Github, Globe, Home, LineChart, MessageSquare, Send, Twitter } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

interface Link {
  title: string;
  url: string;
  icon: React.ReactNode;
  description: string;
}

export const metadata: Metadata = {
  title: 'Links | DYOR hub',
  description: 'Official links for DYOR hub',
};

export default function LinksPage() {
  const links: Link[] = [
    {
      title: 'Website',
      url: 'https://dyorhub.xyz',
      icon: <Globe className='h-4 w-4' />,
      description: 'Official website',
    },
    {
      title: 'Official Twitter',
      url: 'https://x.com/DYORhub',
      icon: <Twitter className='h-4 w-4' />,
      description: 'Latest updates and announcements',
    },
    {
      title: 'Founder Twitter',
      url: 'https://x.com/JulienCoulaud',
      icon: <Twitter className='h-4 w-4' />,
      description: 'Follow Julien',
    },
    {
      title: 'Discord',
      url: DISCORD_URL,
      icon: <MessageSquare className='h-4 w-4' />,
      description: 'HQ for DYOR',
    },
    {
      title: 'Telegram',
      url: TELEGRAM_URL,
      icon: <Send className='h-4 w-4' />,
      description: 'Official Telegram community',
    },
    {
      title: 'DexScreener',
      url: `https://dexscreener.com/solana/${CONTRACT_ADDRESS}`,
      icon: <LineChart className='h-4 w-4' />,
      description: 'Live price chart and info',
    },
    {
      title: 'GitHub',
      url: 'https://github.com/jcoulaud/dyor-hub',
      icon: <Github className='h-4 w-4' />,
      description: 'Open source code repository',
    },
  ];

  return (
    <main className='flex-1 px-4 py-16 md:pt-40'>
      <div className='mx-auto max-w-xl'>
        <div className='mb-8 text-center space-y-2'>
          <h1 className='text-2xl font-medium text-zinc-200'>DYOR hub</h1>
          <p className='text-zinc-400'>
            Your trusted platform for Solana memecoin insights, discussions, and real-time updates.
          </p>
        </div>

        <div className='space-y-3'>
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-white transition-colors hover:bg-zinc-800/50'>
              <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
                {link.icon}
              </span>
              <div>
                <h2 className='text-sm font-medium'>{link.title}</h2>
                <p className='text-xs text-zinc-400'>{link.description}</p>
              </div>
            </a>
          ))}
        </div>

        <div className='mt-10 text-center'>
          <p className='mb-2 text-sm text-zinc-400'>Contract Address</p>
          <CopyButton textToCopy={CONTRACT_ADDRESS} />
        </div>

        <div className='mt-10 text-center'>
          <Link
            href='/'
            className='inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors'>
            <Home className='h-4 w-4' />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
