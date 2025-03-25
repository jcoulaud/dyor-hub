'use client';

import { Card } from '@/components/ui/card';
import { Globe, MessageSquare, Twitter, Linkedin, LineChart, Copy } from 'lucide-react';
import { useState } from 'react';

const links = [
  {
    title: 'Website',
    url: 'https://dyor-hub.com/',
    icon: Globe,
    color: 'blue',
  },
  {
    title: 'Discord',
    url: 'https://discord.gg/GW8t7pFZ',
    icon: MessageSquare,
    color: 'purple',
  },
  {
    title: 'DYOR Hub X (Official)',
    url: 'https://x.com/dyorhub',
    icon: Twitter,
    color: 'white',
  },
  {
    title: 'JulienCoulaud X (Founder)',
    url: 'https://x.com/JulienCoulaud',
    icon: Twitter,
    color: 'white',
  },
  {
    title: 'LinkedIn',
    url: 'https://www.linkedin.com/in/juliencoulaud/',
    icon: Linkedin,
    color: 'blue',
  },
  {
    title: 'DexScreener',
    url: 'https://dexscreener.com/solana/4xmp9hwmvczr8dpbyxijppmniuj9bcmijzfcpwz2vny1',
    icon: LineChart,
    color: 'green',
  },
  {
    title: 'CA: 2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump',
    url: 'https://solscan.io/token/2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump',
    icon: LineChart,
    color: 'green',
    isCA: true,
  },
];

export default function LinksPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className='min-h-screen flex flex-col items-center justify-center p-4 bg-black'>
      {/* Background elements */}
      <div className='absolute inset-0 bg-gradient-to-br from-blue-950/30 to-purple-950/30 z-0' />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />

      {/* Animated gradient orbs */}
      <div className='absolute top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse' />
      <div
        className='absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse'
        style={{ animationDelay: '1s' }}
      />

      <div className='relative z-10 w-full max-w-md space-y-6'>
        <div className='text-center space-y-4'>
          <h1 className='text-2xl font-bold text-white'>DYOR Hub</h1>
          <p className='text-zinc-400'>Your trusted platform for Solana memecoin discussions</p>
        </div>

        <div className='space-y-4'>
          {links.map((link) => (
            <a
              key={link.title}
              href={link.url}
              target='_blank'
              rel='noopener noreferrer'
              className='block'>
              <Card className='group relative overflow-hidden bg-zinc-900/40 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-300'>
                <div className={`absolute inset-0 bg-gradient-to-r from-${link.color}-500/5 to-${link.color}-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className='relative p-4 flex items-center space-x-4'>
                  <div className={`h-10 w-10 rounded-xl bg-${link.color}-500/10 flex items-center justify-center group-hover:bg-${link.color}-500/20 transition-colors duration-300 flex-shrink-0`}>
                    <link.icon className={`h-5 w-5 text-${link.color}-400`} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center space-x-2'>
                      <span className='text-white font-medium truncate'>{link.title}</span>
                      {link.isCA && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleCopy(link.title.split(': ')[1]);
                          }}
                          className='p-1 hover:bg-white/5 rounded-full transition-colors'>
                          <Copy className='h-4 w-4 text-zinc-400 hover:text-white' />
                        </button>
                      )}
                    </div>
                    {copied && link.isCA && (
                      <span className='text-xs text-green-400'>Copied!</span>
                    )}
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
} 
