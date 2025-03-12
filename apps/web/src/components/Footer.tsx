'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

export const Footer = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText('AGAuBEwae93RJaocTE43mvYz72Ay4cqWzc28RNa1XXMi');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className='py-4 bg-zinc-950/70 backdrop-blur-sm border-t border-zinc-900 mt-auto'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col md:flex-row justify-between items-center text-center md:text-left'>
          <div className='mb-2 md:mb-0'>
            <div className='mt-1 space-y-1'>
              <p className='text-zinc-400 text-sm flex items-center justify-center md:justify-start'>
                <span className='inline-block text-zinc-500'>
                  CA: Might drop one if I can&apos;t monetize this project
                </span>
              </p>
              <p className='text-zinc-400 text-sm flex items-center justify-center md:justify-start'>
                <span className='inline-block text-zinc-500'>Donations 💙: </span>
                <span
                  className='font-mono text-sm bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors cursor-pointer flex items-center ml-1'
                  onClick={handleCopyAddress}>
                  AGAuBE...XXMi
                  {copied && <Check className='ml-1.5 h-3.5 w-3.5 text-green-500' />}
                </span>
              </p>
            </div>
          </div>
          <div className='text-zinc-500 text-sm py-2 md:py-0'>
            Made by a{' '}
            <a
              href='https://twitter.com/JulienCoulaud'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-400 hover:text-blue-300 transition-colors'>
              degen
            </a>{' '}
            for degens
          </div>
        </div>
      </div>
    </footer>
  );
};
