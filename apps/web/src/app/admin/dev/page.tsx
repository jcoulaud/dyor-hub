'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AiTradingAnalysisResponse, dev } from '@/lib/api';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState('5');
  const [addCreditsResult, setAddCreditsResult] = useState<string | null>(null);

  const [isLoadingDevAnalysis, setIsLoadingDevAnalysis] = useState(false);
  const [devAnalysisResult, setDevAnalysisResult] = useState<AiTradingAnalysisResponse | null>(
    null,
  );

  const handleBackfillSecurityInfo = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const response = await dev.admin.backfillTokenSecurityInfo();
      setBackfillResult(
        `Processed: ${response.result.processed}, Updated: ${response.result.updated}, Failed: ${response.result.failed}, No Data: ${response.result.noData}`,
      );
      toast({
        title: 'Backfill Complete',
        description: response.message,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to backfill token security info';
      setBackfillResult(`Error: ${message}`);
      toast({
        title: 'Backfill Error',
        description: message,
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
      const response = await dev.admin.addCreditsToAllUsers(numCredits);
      setAddCreditsResult(
        `Credits added to ${response.affected} users. Transactions created: ${response.transactionsCreated}.`,
      );
      toast({
        title: 'Credits Added',
        description: 'Successfully added credits to all users.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add credits';
      setAddCreditsResult(`Error: ${message}`);
      toast({
        title: 'Add Credits Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsAddingCredits(false);
    }
  };

  const handleFetchDevAnalysisPreview = async () => {
    setIsLoadingDevAnalysis(true);
    setDevAnalysisResult(null);
    try {
      const response = await dev.admin.fetchDevelopmentAnalysisPreview();
      if (response) {
        setDevAnalysisResult(response);
        toast({
          title: 'Analysis Fetched',
          description: 'Development analysis preview fetched successfully!',
        });
      } else {
        setDevAnalysisResult(null);
        toast({
          title: 'Analysis Info',
          description:
            'Could not generate analysis preview. No suitable token found or an error occurred.',
          variant: 'default',
        });
      }
    } catch (error: unknown) {
      setDevAnalysisResult(null);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch development analysis preview';
      toast({
        title: 'Fetch Analysis Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDevAnalysis(false);
    }
  };

  return (
    <div className='container mx-auto p-4 space-y-8'>
      <h1 className='mb-4 text-2xl font-bold'>Dev Admin Tools</h1>

      <section className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='text-xl font-semibold mb-2'>Token Security Backfill</h2>
        <Button onClick={handleBackfillSecurityInfo} disabled={isBackfilling}>
          {isBackfilling ? 'Backfilling...' : 'Start Token Security Backfill'}
        </Button>
        {backfillResult && (
          <pre className='mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm'>
            {backfillResult}
          </pre>
        )}
      </section>

      <section className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='text-xl font-semibold mb-2'>Add Credits to All Users</h2>
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
          <pre className='mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm'>
            {addCreditsResult}
          </pre>
        )}
      </section>

      <section className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='text-xl font-semibold mb-2'>Development AI Analysis Preview</h2>
        <p className='text-sm text-muted-foreground mb-2'>
          Triggers the AI analysis for a trending token (without posting to Twitter) and displays
          the full analysis object.
        </p>
        <Button onClick={handleFetchDevAnalysisPreview} disabled={isLoadingDevAnalysis}>
          {isLoadingDevAnalysis ? 'Fetching Analysis...' : 'Get Dev Analysis Preview'}
        </Button>
        {devAnalysisResult && (
          <pre className='mt-4 p-4 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-sm overflow-x-auto'>
            {JSON.stringify(devAnalysisResult, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
