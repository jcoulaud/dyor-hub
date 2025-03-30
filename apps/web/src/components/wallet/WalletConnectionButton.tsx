'use client';

import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function WalletConnectionButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  return (
    <Button
      variant={connected ? 'outline' : 'default'}
      onClick={handleClick}
      className='font-medium'>
      {connected ? truncateAddress(publicKey?.toBase58() || '') : 'Connect Wallet'}
    </Button>
  );
}
