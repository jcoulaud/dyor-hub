'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLinkIcon, InfoIcon, RefreshCwIcon } from 'lucide-react';
import { FC } from 'react';

interface WalletTroubleshootingProps {
  walletType?: string;
  onRetry?: () => void;
}

export const WalletTroubleshooting: FC<WalletTroubleshootingProps> = ({
  walletType = 'Phantom',
  onRetry,
}) => {
  return (
    <Alert className='mt-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'>
      <InfoIcon className='h-4 w-4 text-amber-600 dark:text-amber-400' />
      <AlertTitle className='text-amber-800 dark:text-amber-300'>
        Wallet Verification Troubleshooting
      </AlertTitle>
      <AlertDescription className='text-sm space-y-2 mt-2'>
        <p>
          Your {walletType} wallet is having difficulty with permission to sign messages on our
          site. This can happen even if signing works on other websites.
        </p>

        <div className='font-medium mt-2 mb-1'>Try these solutions:</div>

        <ul className='list-disc pl-5 space-y-1.5 text-xs'>
          <li>
            <strong>Open {walletType} directly</strong> - Click the extension icon and approve the
            message there
          </li>
          <li>
            <strong>Use a different browser</strong> - Chrome or Firefox tend to work best with
            wallet extensions
          </li>
          <li>
            <strong>Make sure your wallet extension is up to date</strong> - Check for updates in
            your browser&apos;s extension store
          </li>
          <li>
            <strong>Disconnect and reconnect your wallet</strong> - This often resolves permission
            issues
          </li>
          <li>
            <strong>Try in Incognito/Private mode</strong> - Sometimes browser extensions conflict
          </li>
          <li>
            <strong>Check site permissions in {walletType}</strong> - Open wallet settings and check
            permissions for this site
          </li>
        </ul>

        <div className='flex flex-wrap gap-2 mt-3'>
          {onRetry && (
            <Button
              variant='outline'
              size='sm'
              onClick={onRetry}
              className='h-8 text-xs flex items-center gap-1.5 bg-white dark:bg-transparent'>
              <RefreshCwIcon className='h-3 w-3' />
              Try Again
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              window.open('https://phantom.app/help/troubleshooting-transaction-failures', '_blank')
            }
            className='h-8 text-xs flex items-center gap-1.5 bg-white dark:bg-transparent'>
            <ExternalLinkIcon className='h-3 w-3' />
            {walletType} Help
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
