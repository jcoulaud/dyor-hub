'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ApiError, referrals } from '@/lib/api';
import { Referral } from '@dyor-hub/types';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

const getReferralLink = (code: string): string => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?ref=${code}`;
};

export default function ReferralsPage() {
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [hasBeenReferred, setHasBeenReferred] = useState<boolean | null>(null);
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);
  const [referralHistory, setReferralHistory] = useState<Referral[]>([]);
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const { toast } = useToast();

  const referralLink = myReferralCode ? getReferralLink(myReferralCode) : '';

  useEffect(() => {
    const fetchData = async () => {
      if (myReferralCode !== null || hasBeenReferred !== null) {
        return;
      }

      setIsLoadingCode(true);
      setIsLoadingStatus(true);
      setIsLoadingHistory(true);

      try {
        const [codeData, statusData, historyData] = await Promise.all([
          referrals.getMyCode(),
          referrals.getMyStatus(),
          referrals.getMyHistory(),
        ]);
        setMyReferralCode(codeData.referralCode);
        setHasBeenReferred(statusData.hasBeenReferred);
        if (statusData.hasBeenReferred && statusData.referrerUsername) {
          setReferrerUsername(statusData.referrerUsername);
        }
        setReferralHistory(historyData);
      } catch {
        toast({
          title: 'Error',
          description: 'Could not load your referral information.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingCode(false);
        setIsLoadingStatus(false);
        setIsLoadingHistory(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualCode || isSubmittingCode || hasBeenReferred === null) return;

    setIsSubmittingCode(true);
    try {
      const result = await referrals.applyCode(manualCode.trim());
      setReferrerUsername(result.referrerUsername);
      setHasBeenReferred(true);
      toast({
        title: 'Success',
        description: `Referral code applied successfully! You were referred by ${result.referrerUsername}.`,
      });
      setManualCode('');
    } catch (error) {
      let message = 'Could not apply the referral code. Please check the code and try again.';

      if (error instanceof ApiError) {
        if (
          error.data &&
          typeof error.data === 'object' &&
          'message' in error.data &&
          error.data.message
        ) {
          message = Array.isArray(error.data.message)
            ? error.data.message.join(', ')
            : String(error.data.message);
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast({
        title: 'Error Applying Code',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleCopy = (textToCopy: string, type: string) => {
    if (!navigator.clipboard) {
      toast({
        title: 'Error',
        description: 'Clipboard API not available.',
        variant: 'destructive',
      });
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast({
          title: `${type} Copied`,
          description: `${type} copied to clipboard`,
        });
      },
      () => {
        toast({
          title: 'Error',
          description: `Failed to copy ${type.toLowerCase()}.`,
          variant: 'destructive',
        });
      },
    );
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with others to invite them to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {isLoadingCode ? (
            <p>Loading your code...</p>
          ) : myReferralCode ? (
            <>
              <div>
                <Label htmlFor='referralCode'>Your Code</Label>
                <div className='flex items-center gap-2'>
                  <Input id='referralCode' value={myReferralCode} readOnly className='flex-grow' />
                  <Button
                    variant='outline'
                    size='icon'
                    aria-label='Copy code'
                    onClick={() => handleCopy(myReferralCode, 'Code')}>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor='referralLink'>Your Link</Label>
                <div className='flex items-center gap-2'>
                  <Input id='referralLink' value={referralLink} readOnly className='flex-grow' />
                  <Button
                    variant='outline'
                    size='icon'
                    aria-label='Copy link'
                    onClick={() => handleCopy(referralLink, 'Link')}>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p>Could not load your referral code.</p>
          )}
        </CardContent>
      </Card>

      {isLoadingStatus ? (
        <p>Loading referral status...</p>
      ) : hasBeenReferred === false ? (
        <Card>
          <CardHeader>
            <CardTitle>Apply a Referral Code</CardTitle>
            <CardDescription>Were you referred by someone? Enter their code below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualCodeSubmit} className='flex items-end gap-2'>
              <div className='flex-grow space-y-1'>
                <Label htmlFor='manualCode'>Referral Code</Label>
                <Input
                  id='manualCode'
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder='Enter code'
                  maxLength={5}
                  minLength={5}
                  required
                  className='w-full'
                  disabled={isSubmittingCode}
                />
              </div>
              <Button type='submit' disabled={isSubmittingCode}>
                {isSubmittingCode ? 'Applying...' : 'Apply Code'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : hasBeenReferred === true ? (
        <Card>
          <CardHeader>
            <CardTitle>Referral Applied</CardTitle>
            <CardDescription>
              {referrerUsername
                ? `You were successfully referred by ${referrerUsername}!`
                : 'You were successfully referred to the platform!'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your Referral History</CardTitle>
          <CardDescription>Users you have successfully referred.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <p>Loading history...</p>
          ) : referralHistory.length > 0 ? (
            <ul className='space-y-2'>
              {referralHistory.map((ref) => (
                <li key={ref.id} className='text-sm text-muted-foreground'>
                  Referred user{' '}
                  {ref.referredUser?.username || `${ref.referredUserId.substring(0, 8)}...`} on{' '}
                  {new Date(ref.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>You haven&apos;t referred anyone yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
