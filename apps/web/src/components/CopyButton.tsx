'use client';

import { Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  shouldTruncate?: boolean;
}

const truncateText = (text: string) => {
  if (text.length <= 10) return text;
  return `${text.slice(0, 5)}...${text.slice(-5)}`;
};

export function CopyButton({ textToCopy, shouldTruncate = true }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    const button = document.getElementById('copy-button');
    if (button) {
      button.classList.add('copied');
      setTimeout(() => button.classList.remove('copied'), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      id='copy-button'
      className='group relative inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-zinc-300 hover:bg-zinc-800/50 cursor-pointer text-sm'>
      <code className='font-mono'>
        {shouldTruncate ? (
          <>
            <span className='md:hidden'>{truncateText(textToCopy)}</span>
            <span className='hidden md:inline'>{textToCopy}</span>
          </>
        ) : (
          textToCopy
        )}
      </code>
      <span className='text-zinc-500 transition-colors group-hover:text-zinc-400 group-[.copied]:hidden'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'>
          <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
          <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
        </svg>
      </span>
      <span className='hidden text-green-500 group-[.copied]:inline'>
        <Check className='h-3 w-3' />
      </span>
    </button>
  );
}
