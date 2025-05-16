'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { dev, users } from '@/lib/api';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState('5');
  const [addCreditsResult, setAddCreditsResult] = useState<string | null>(null);

  const handleBackfillSecurityInfo = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await dev.admin.backfillTokenSecurityInfo();
      const message = `${result.message} Processed: ${result.result.processed}, Updated: ${result.result.updated}, Failed: ${result.result.failed}, No Data/Skipped: ${result.result.noData}`;
      setBackfillResult(message);
      toast({
        title: 'Security Backfill Started',
        description: message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setBackfillResult(`Error: ${errorMessage}`);
      toast({
        title: 'Security Backfill Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleAddCreditsToAllUsers = async () => {
    setIsAddingCredits(true);
    setAddCreditsResult(null);
    const numCredits = parseInt(creditsToAdd, 10);

    if (isNaN(numCredits) || numCredits <= 0) {
      setAddCreditsResult('Error: Please enter a valid positive number for credits.');
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid positive number for credits.',
        variant: 'destructive',
      });
      setIsAddingCredits(false);
      return;
    }

    try {
      const result = await users.admin.addCreditsToAllUsers(numCredits);
      const message = `Successfully added ${numCredits} credits to ${result.affected} users.`;
      setAddCreditsResult(message);
      toast({
        title: 'Credits Added Successfully',
        description: message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setAddCreditsResult(`Error: ${errorMessage}`);
      toast({
        title: 'Error Adding Credits',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAddingCredits(false);
    }
  };

  return (
    <div className='container mx-auto p-4 space-y-8'>
      <h1 className='mb-4 text-2xl font-bold'>Dev Admin Tools</h1>

      <div className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='mb-3 text-lg font-semibold'>Token Security Backfill</h2>
        <p className='mb-4 text-sm text-muted-foreground'>
          Fetch and store security information (creator address, creation tx, creation time) for all
          tokens using the Birdeye API.
        </p>
        <Button
          onClick={handleBackfillSecurityInfo}
          disabled={isBackfilling}
          aria-label='Start backfilling token security information'>
          {isBackfilling ? 'Backfilling...' : 'Backfill Security Info'}
        </Button>
        {backfillResult && (
          <pre className='mt-4 overflow-x-auto rounded bg-muted p-3 text-sm'>{backfillResult}</pre>
        )}
      </div>

      <div className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='mb-3 text-lg font-semibold'>Add Credits to All Users</h2>
        <p className='mb-4 text-sm text-muted-foreground'>
          Grant a specified number of credits to every existing user in the system.
        </p>
        <div className='flex items-center space-x-2'>
          <Input
            type='number'
            value={creditsToAdd}
            onChange={(e) => setCreditsToAdd(e.target.value)}
            placeholder='Number of credits'
            className='w-40'
            disabled={isAddingCredits}
          />
          <Button
            onClick={handleAddCreditsToAllUsers}
            disabled={isAddingCredits}
            aria-label='Add credits to all users'>
            {isAddingCredits ? 'Adding Credits...' : 'Add Credits to All Users'}
          </Button>
        </div>
        {addCreditsResult && (
          <pre className='mt-4 overflow-x-auto rounded bg-muted p-3 text-sm'>
            {addCreditsResult}
          </pre>
        )}
      </div>
    </div>
  );
}
