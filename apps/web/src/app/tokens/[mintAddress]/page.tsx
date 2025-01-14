import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import type { TokenEntity, TokenHolder, TokenMarketData, TokenSecurity } from '@dyor-hub/types';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { mintAddress: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

async function fetchTokenData(mintAddress: string): Promise<{
  token: TokenEntity;
  marketData: TokenMarketData;
  security: TokenSecurity;
  holders: TokenHolder[];
}> {
  if (!isValidSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana address format');
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens/${mintAddress}`, {
      cache: 'no-store',
    });

    if (response.status === 404) {
      throw new Error('Token not found');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch token data');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching token data:', error);
    throw error;
  }
}

export default async function TokenPage(props: PageProps) {
  const mintAddress = (await props.params).mintAddress;

  if (!mintAddress) {
    notFound();
  }

  if (!isValidSolanaAddress(mintAddress)) {
    return (
      <main className='container mx-auto px-4 py-8'>
        <Alert variant='destructive'>
          <AlertTitle>Invalid Address</AlertTitle>
          <AlertDescription>
            The provided address is not a valid Solana address format.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  try {
    const data = await fetchTokenData(mintAddress);

    return (
      <main className='container mx-auto space-y-6 p-4 py-8'>
        <div className='flex flex-col space-y-2'>
          <h1 className='text-3xl font-bold'>Token Details</h1>
          <p className='text-muted-foreground'>{data.token.name || data.token.mintAddress}</p>
        </div>

        <Card className='p-6'>
          <pre className='whitespace-pre-wrap text-sm'>{JSON.stringify(data, null, 2)}</pre>
        </Card>
      </main>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return (
      <main className='container mx-auto px-4 py-8'>
        <Alert variant='destructive'>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </main>
    );
  }
}
