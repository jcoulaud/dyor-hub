'use client';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { DYORHUB_SYMBOL } from '@/lib/constants';
import { TokenGatedErrorData } from '@dyor-hub/types';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface TokenGatedMessageProps {
  error: ApiError;
  featureName?: string;
}

export const TokenGatedMessage = ({ error, featureName }: TokenGatedMessageProps) => {
  if (error.status !== 403) {
    return (
      <div className='py-6 px-4 text-center text-sm text-zinc-300 space-y-3'>
        <p>
          {error.message ||
            `An unexpected error occurred while accessing ${featureName || 'this feature'}.`}
        </p>
      </div>
    );
  }

  const errorData = error.data as Partial<TokenGatedErrorData> | string | undefined;
  const apiMessage =
    typeof errorData === 'object' && errorData?.message ? errorData.message : undefined;
  const messageFromServer =
    apiMessage || (typeof errorData === 'string' ? errorData : error.message);

  const requiredBalanceStr = typeof errorData === 'object' ? errorData.requiredBalance : undefined;
  const currentBalanceStr = typeof errorData === 'object' ? errorData.currentBalance : undefined;
  const requiredTokenSymbol =
    typeof errorData === 'object' && errorData?.requiredTokenSymbol
      ? errorData.requiredTokenSymbol
      : DYORHUB_SYMBOL;
  const hasBalanceInfo = requiredBalanceStr && currentBalanceStr;

  return (
    <>
      <div className='py-6 px-4 text-center text-sm text-zinc-300 space-y-3'>
        <Lock className='w-10 h-10 text-orange-400 mx-auto mb-3' />
        <h3 className='text-lg font-semibold text-orange-400'>
          {featureName ? `${featureName} - Access Gated` : 'Access Gated'}
        </h3>
        <p>{messageFromServer || `Access to ${featureName || 'this feature'} is token-gated.`}</p>
        {hasBalanceInfo && (
          <p className='font-semibold mt-2 p-2 bg-zinc-800/50 rounded-md border border-zinc-700'>
            Required: {requiredBalanceStr ? parseInt(requiredBalanceStr, 10).toLocaleString() : '-'}{' '}
            {requiredTokenSymbol} <br />
            Your Balance:{' '}
            {currentBalanceStr ? parseInt(currentBalanceStr, 10).toLocaleString() : '-'}{' '}
            {requiredTokenSymbol}
          </p>
        )}
        <p className='text-xs text-zinc-400 pt-2'>
          Please ensure your primary connected wallet holds the required amount of{' '}
          {requiredTokenSymbol}.
        </p>
        <div className='mt-6'>
          <Button asChild variant='secondary' size='sm'>
            <Link href='/account/wallet'>Manage Wallet</Link>
          </Button>
        </div>
      </div>
    </>
  );
};
