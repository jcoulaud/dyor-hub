import { RefreshTokenButton } from '@/components/RefreshTokenButton';
import { Card } from '@/components/ui/card';
import type { Token } from '@dyor-hub/types';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ mintAddress: string }>;
};

export default async function Page({ params }: PageProps) {
  const { mintAddress } = await params;

  if (!mintAddress || !isValidSolanaAddress(mintAddress)) {
    notFound();
  }

  const data = await fetchTokenData(mintAddress);

  if (!data) {
    notFound();
  }

  return (
    <main className='container mx-auto space-y-6 p-4 py-8'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col space-y-2'>
          <h1 className='text-3xl font-bold'>Token Details</h1>
          <p className='text-muted-foreground'>{data.mintAddress}</p>
        </div>
        <RefreshTokenButton token={data} />
      </div>

      <Card className='p-6'>
        <pre className='whitespace-pre-wrap text-sm'>{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </main>
  );
}

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

async function fetchTokenData(mintAddress: string): Promise<Token | null> {
  if (!isValidSolanaAddress(mintAddress)) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens/${mintAddress}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch token data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching token data:', error);
    throw error;
  }
}
