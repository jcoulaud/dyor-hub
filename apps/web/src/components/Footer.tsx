'use client';

import { CONTRACT_ADDRESS } from '@/lib/constants';
import { CopyButton } from './CopyButton';

export const Footer = () => {
  return (
    <footer className='py-4 bg-zinc-950/70 backdrop-blur-sm border-t border-zinc-900 mt-auto'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col md:flex-row justify-between items-center'>
          <div className='flex flex-col items-center md:items-start mb-2 md:mb-0 text-sm text-zinc-400'>
            <div className='flex items-center justify-center md:justify-start'>
              <span className='text-zinc-500'>CA:&nbsp;</span>
              <CopyButton textToCopy={CONTRACT_ADDRESS} />
            </div>
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
          </div>
        </div>
      </div>
    </footer>
  );
};
