import { Token } from '@dyor-hub/types';
import Link from 'next/link';
import { useState } from 'react';
import { TokenImage } from './TokenImage';

interface TokenListProps {
  tokens: Token[];
}

export function TokenList({ tokens }: TokenListProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Limit to 50 most viewed tokens
  const sortedTokens = [...tokens].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 50);

  // Process image URLs - replace cf-ipfs.com with ipfs.io
  const processedTokens = sortedTokens.map((token) => ({
    ...token,
    imageUrl: token.imageUrl?.includes('cf-ipfs.com/ipfs/')
      ? token.imageUrl.replace('cf-ipfs.com/ipfs/', 'ipfs.io/ipfs/')
      : token.imageUrl,
  }));

  return (
    <div className='w-full overflow-x-hidden -mt-8 mb-12'>
      <div
        className='flex gap-4 px-4 sm:px-6 lg:px-8 sm:animate-scroll max-sm:animate-scroll-mobile'
        style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        {processedTokens.map((token) => (
          <Link
            key={token.mintAddress}
            href={`/tokens/${token.mintAddress}`}
            className='group flex-shrink-0'>
            <div className='flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900/50 transition-colors duration-200 border border-zinc-700/50 hover:border-blue-500'>
              <TokenImage
                imageUrl={token.imageUrl}
                name={token.name}
                symbol={token.symbol}
                size='small'
              />
              <span className='text-xs font-medium text-white group-hover:text-zinc-200'>
                ${token.symbol}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
