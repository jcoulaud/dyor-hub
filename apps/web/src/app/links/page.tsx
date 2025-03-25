import { CopyButton } from '@/components/CopyButton';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { Globe, LineChart, MessageSquare, Twitter } from 'lucide-react';
import { Metadata } from 'next';

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
      url: 'https://discord.gg/UxCTFNUU',
      icon: <MessageSquare className='h-4 w-4' />,
      description: 'HQ for DYOR',
    },
    {
      title: 'DexScreener',
      url: 'https://dexscreener.com/solana/2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump',
      icon: <LineChart className='h-4 w-4' />,
      description: 'Live price chart and info',
    },
  ];

  return (
    <main className='flex-1 px-4 py-16 md:pt-40'>
      <div className='mx-auto max-w-xl'>
        <div className='mb-8 text-center space-y-2'>
          <h1 className='text-2xl font-medium text-zinc-200'>DYOR hub</h1>
          <p className='text-zinc-400'>Your trusted platform for Solana memecoin discussions</p>
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
      </div>
    </main>
  );
}
