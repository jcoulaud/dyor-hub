'use client';

import { ReactNode, useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  children?: ReactNode;
}

export function CopyButton({ textToCopy, className, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // If no children are provided, render the default copy button
  if (!children) {
    return (
      <button
        onClick={handleCopy}
        className={className || 'text-xs text-zinc-500 hover:text-zinc-300 transition-colors'}
        title={copied ? 'Copied!' : 'Copy to clipboard'}>
        {copied ? (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'>
            <path d='M20 6L9 17l-5-5' />
          </svg>
        ) : (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'>
            <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
            <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
          </svg>
        )}
      </button>
    );
  }

  // If children are provided, render them with the copy functionality
  return (
    <button
      onClick={handleCopy}
      className={className}
      title={copied ? 'Copied!' : 'Copy to clipboard'}>
      {children}
      {copied && (
        <span className='absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center bg-zinc-900/80 rounded-md text-green-500'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'>
            <path d='M20 6L9 17l-5-5' />
          </svg>
        </span>
      )}
    </button>
  );
}
