'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { ConnectWalletCard } from './ConnectWalletCard';
import { WalletDetails } from './WalletDetails';

export function WalletContent() {
  const { connected } = useWallet();

  return connected ? <WalletDetails /> : <ConnectWalletCard />;
}
