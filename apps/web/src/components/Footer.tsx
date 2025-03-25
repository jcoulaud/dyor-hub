'use client';

import { CONTRACT_ADDRESS } from '@/lib/constants';
import { Github } from 'lucide-react';
import { CopyButton } from './CopyButton';

export const Footer = () => {
  return (
    <footer className='py-4 bg-zinc-950/70 backdrop-blur-sm border-t border-zinc-900 mt-auto'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col md:flex-row justify-between items-center text-center md:text-left'>
          <div className='mb-2 md:mb-0'>
            <div className='mt-1 space-y-1'>
              <p className='text-zinc-400 text-sm flex items-center justify-center md:justify-start'>
                <span className='inline-block text-zinc-500 break-all'>
                  CA: 2MCmXsjSXHoQYR6ckg6Af4mhQKDMJMGy6JKh8C4Qpump
                </span>
              </p>
              <p className='text-zinc-400 text-sm flex items-center justify-center md:justify-start'>
                <span className='inline-block text-zinc-500'>Donations 💙 </span>
                <span
                  className='font-mono text-sm bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors cursor-pointer flex items-center ml-1'
                  onClick={handleCopyAddress}>
                  AGAuBE...XXMi
                  {copied && <Check className='ml-1.5 h-3.5 w-3.5 text-green-500' />}
                </span>
              </p>
            </div>
            <a href='/links' className='text-zinc-500 hover:text-blue-300 transition-colors mt-1'>
              Official Links
            </a>
          </div>
          <div className='text-zinc-500 text-sm py-2 md:py-0 flex flex-col items-center md:items-end'>
            <div>
              Made by a{' '}
              <a
                href='https://x.com/JulienCoulaud'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-400 hover:text-blue-300 transition-colors'>
                degen
              </a>{' '}
              for degens
            </div>
            <a
              href='https://github.com/jcoulaud/dyor-hub'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center text-zinc-500 hover:text-blue-300 transition-colors mt-1'>
              <Github className='h-3.5 w-3.5 mr-1' />
              Open Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
