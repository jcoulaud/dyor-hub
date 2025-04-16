'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase';
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus';
import { clusterApiUrl } from '@solana/web3.js';
import dynamic from 'next/dynamic';
import { useMemo, type ReactNode } from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamic import to prevent SSR hydration issues
const WalletProviderClient = dynamic(() => Promise.resolve(WalletProviderInner), { ssr: false });

interface WalletProviderProps {
  children: ReactNode;
}

function WalletProviderInner({ children }: WalletProviderProps) {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/solana-rpc`
      : clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network],
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet error:', error);
        }}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function SolanaWalletProvider({ children }: WalletProviderProps) {
  return <WalletProviderClient>{children}</WalletProviderClient>;
}
