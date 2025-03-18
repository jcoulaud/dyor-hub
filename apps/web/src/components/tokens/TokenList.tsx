import { Token } from '@dyor-hub/types';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

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

  // Duplicate the tokens once to ensure seamless scrolling
  const displayTokens = [...processedTokens, ...processedTokens];

  return (
    <div className='w-full overflow-x-hidden -mt-8 mb-12'>
      <div
        className='flex gap-4 px-4 sm:px-6 lg:px-8 animate-scroll'
        style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        {displayTokens.map((token, index) => (
          <Link
            key={`${token.mintAddress}-${index}`}
            href={`/tokens/${token.mintAddress}`}
            className='group flex-shrink-0'>
            <div className='flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors duration-200'>
              {token.imageUrl && (
                <div className='relative w-5 h-5 rounded overflow-hidden shrink-0'>
                  <Image
                    src={token.imageUrl}
                    alt={token.symbol}
                    fill
                    className='object-cover group-hover:scale-105 transition-transform duration-200'
                  />
                </div>
              )}
              <span className='text-xs font-medium text-white'>${token.symbol}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
