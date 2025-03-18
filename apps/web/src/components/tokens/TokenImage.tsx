import { Coins } from 'lucide-react';
import Image from 'next/image';

interface TokenImageProps {
  imageUrl?: string | null;
  name: string;
  symbol: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function TokenImage({
  imageUrl,
  name,
  symbol,
  size = 'medium',
  className = '',
}: TokenImageProps) {
  // Size mapping
  const sizeMap = {
    small: {
      container: 'w-5 h-5',
      icon: 'w-3 h-3',
      fontSize: 'text-xs',
    },
    medium: {
      container: 'w-20 h-20 sm:w-24 sm:h-24',
      icon: 'w-10 h-10',
      fontSize: 'text-2xl',
    },
    large: {
      container: 'w-24 h-24 sm:w-32 sm:h-32',
      icon: 'w-16 h-16',
      fontSize: 'text-4xl',
    },
  };

  const containerClass = `${sizeMap[size].container} ${className} relative rounded-xl overflow-hidden shrink-0 border border-zinc-800/50 shadow-lg group-hover:shadow-blue-500/10 transition-all duration-300`;

  // Gradient overlay for both image and placeholder
  const gradientOverlay =
    'absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10';

  // If we have an image URL, display the image
  if (imageUrl) {
    return (
      <div className={containerClass}>
        <div className={gradientOverlay} />
        <Image
          src={imageUrl}
          alt={name || symbol}
          fill
          sizes={
            size === 'small'
              ? '20px'
              : size === 'medium'
                ? '(max-width: 768px) 80px, 96px'
                : '(max-width: 768px) 96px, 128px'
          }
          priority={size !== 'small'}
          className='object-cover group-hover:scale-105 transition-transform duration-500'
        />
      </div>
    );
  }

  // Otherwise, display a placeholder with the first letter of the symbol
  return (
    <div className={containerClass}>
      <div className={gradientOverlay} />
      <div className='absolute inset-0 bg-gradient-to-br from-blue-800/30 to-purple-800/30 flex items-center justify-center'>
        {symbol ? (
          <div className={`font-bold text-blue-300 ${sizeMap[size].fontSize}`}>
            {symbol.charAt(0).toUpperCase()}
          </div>
        ) : (
          <Coins className={`${sizeMap[size].icon} text-blue-300`} />
        )}
      </div>
    </div>
  );
}
