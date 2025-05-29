import Image from 'next/image';
import Link from 'next/link';

const LINKS = [
  {
    name: 'GMGN',
    icon: 'https://www.google.com/s2/favicons?domain=gmgn.ai',
    url: (token: string) => `https://gmgn.ai/sol/token/${token}`,
  },
  {
    name: 'DEX Screener',
    icon: 'https://www.google.com/s2/favicons?domain=dexscreener.com',
    url: (token: string) => `https://dexscreener.com/solana/${token}`,
  },
  {
    name: 'Birdeye',
    icon: 'https://www.google.com/s2/favicons?domain=birdeye.so',
    url: (token: string) => `https://birdeye.so/token/${token}?chain=solana`,
  },
  {
    name: 'DexTools',
    icon: 'https://www.google.com/s2/favicons?domain=dextools.io',
    url: (token: string) => `https://www.dextools.io/app/en/solana/pair-explorer/${token}`,
  },
  {
    name: 'GeckoTerminal',
    icon: 'https://www.google.com/s2/favicons?domain=geckoterminal.com',
    url: (token: string) => `https://www.geckoterminal.com/solana/tokens/${token}`,
  },
  {
    name: 'Bubblemaps',
    icon: 'https://www.google.com/s2/favicons?domain=bubblemaps.io',
    url: (token: string) => `https://app.bubblemaps.io/sol/token/${token}`,
  },
  {
    name: 'RugCheck',
    icon: 'https://www.google.com/s2/favicons?domain=rugcheck.xyz',
    url: (token: string) => `https://rugcheck.xyz/tokens/${token}`,
  },
];

type Props = {
  tokenAddress: string;
  className?: string;
};

export const TokenExternalLinks = ({ tokenAddress, className = '' }: Props) => {
  return (
    <div className={`flex flex-row flex-nowrap items-center gap-2 overflow-x-auto ${className}`}>
      {LINKS.map(({ name, icon, url }) => (
        <Link
          key={name}
          href={url(tokenAddress)}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-center gap-2 w-10 h-10 bg-black-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'
          title={name}>
          <Image src={icon} alt={name} width={20} height={20} className='rounded-sm' />
        </Link>
      ))}
    </div>
  );
};
