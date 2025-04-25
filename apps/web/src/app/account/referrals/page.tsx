'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ApiError, referrals } from '@/lib/api';
import { Referral } from '@dyor-hub/types';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('my-code');
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
      setActiveTab('referred-by');
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

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on DYOR hub!',
          text: 'Check out this platform for Solana degens, memecoin community insights, predictions and more!',
          url: referralLink,
        });
        toast({
          title: 'Shared successfully',
          description: 'Referral link shared successfully!',
        });
      } catch {
        console.log('Share was canceled or failed');
      }
    } else {
      handleCopy(referralLink, 'Link');
    }
  };

  if (isLoadingCode && isLoadingStatus && isLoadingHistory) {
    return (
      <div className='space-y-8'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-full max-w-md' />
        </div>

        <div className='space-y-4'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-[200px] w-full rounded-lg' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-500'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-bold tracking-tight'>Referral Program</h1>
        <p className='text-muted-foreground'>
          Invite friends to join the platform and track your successful referrals.
        </p>
      </div>

      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full'>
        <TabsList className='grid grid-cols-3 mb-6'>
          <TabsTrigger value='my-code' className='flex items-center gap-2'>
            <Share2 className='h-4 w-4' />
            <span>My Referral</span>
          </TabsTrigger>
          <TabsTrigger value='referred-by' className='flex items-center gap-2'>
            <UserPlus className='h-4 w-4' />
            <span>Referred By</span>
          </TabsTrigger>
          <TabsTrigger value='history' className='flex items-center gap-2'>
            <Users className='h-4 w-4' />
            <span>My Referrals</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='my-code'
          className='mt-0 animate-in fade-in-50 slide-in-from-left-5 duration-300'>
          <Card className='border-2 bg-gradient-to-b from-primary/5 to-background overflow-hidden'>
            <CardHeader className='pb-4'>
              <div className='flex justify-between items-start'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Gift className='h-5 w-5 text-primary' />
                    Your Referral Code
                  </CardTitle>
                  <CardDescription>
                    Share this code or link with others to invite them to the platform
                  </CardDescription>
                </div>
                <Badge
                  variant='outline'
                  className='bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary'>
                  {referralHistory.length} Referral{referralHistory.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {isLoadingCode ? (
                <div className='space-y-4'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : myReferralCode ? (
                <>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
                        <span className='text-muted-foreground'>CODE:</span>
                      </div>
                      <Input
                        id='referralCode'
                        value={myReferralCode}
                        readOnly
                        className='pl-[4.5rem] bg-muted font-mono text-lg tracking-wider'
                      />
                      <Button
                        variant='ghost'
                        size='icon'
                        className='absolute inset-y-0 right-0 flex items-center justify-center w-10'
                        onClick={() => handleCopy(myReferralCode, 'Code')}
                        aria-label='Copy code'>
                        <Copy className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='referralLink' className='text-sm font-medium'>
                      Your Link
                    </Label>
                    <div className='relative'>
                      <Input
                        id='referralLink'
                        value={referralLink}
                        readOnly
                        className='pr-24 truncate bg-muted'
                      />
                      <div className='absolute inset-y-0 right-0 flex items-center gap-1 pr-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => handleCopy(referralLink, 'Link')}
                          aria-label='Copy link'>
                          <Copy className='h-4 w-4' />
                        </Button>
                        <Button variant='default' size='sm' className='h-8' onClick={handleShare}>
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className='p-6 bg-muted rounded-lg text-center'>
                  <p>Could not load your referral code.</p>
                  <Button
                    variant='outline'
                    className='mt-2'
                    onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className='bg-muted/50 border-t px-6 py-4'>
              <div className='w-full space-y-1'>
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>Share on social media or directly with friends</span>
                  <span>Increase your rank on the leaderboard</span>
                </div>
                <Progress value={Math.min(100, referralHistory.length * 20)} className='h-1' />
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent
          value='referred-by'
          className='mt-0 animate-in fade-in-50 slide-in-from-left-5 duration-300'>
          {isLoadingStatus ? (
            <Skeleton className='h-[200px] w-full rounded-lg' />
          ) : hasBeenReferred === true ? (
            <Card className='border-2 border-green-500/20 bg-gradient-to-b from-green-500/5 to-background overflow-hidden'>
              <CardHeader>
                <div className='flex flex-col items-center text-center'>
                  <div className='h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2'>
                    <CheckCircle2 className='h-8 w-8 text-green-500' />
                  </div>
                  <CardTitle>Referral Applied</CardTitle>
                  <CardDescription className='text-base'>
                    {referrerUsername
                      ? `You were successfully referred by ${referrerUsername}!`
                      : 'You were successfully referred to the platform!'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className='pb-8 text-center'>
                <Badge
                  variant='outline'
                  className='bg-green-500/10 border-green-500/20 text-green-500'>
                  Active Member
                </Badge>
              </CardContent>
            </Card>
          ) : hasBeenReferred === false ? (
            <Card className='overflow-hidden'>
              <CardHeader>
                <CardTitle>Apply a Referral Code</CardTitle>
                <CardDescription>
                  Were you referred by someone? Enter their code below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualCodeSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='manualCode'>Referral Code</Label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
                        <span className='text-muted-foreground'>CODE:</span>
                      </div>
                      <Input
                        id='manualCode'
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder='Enter 5-character code'
                        maxLength={5}
                        minLength={5}
                        required
                        className='pl-[4.5rem] font-mono text-lg tracking-wider'
                        disabled={isSubmittingCode}
                      />
                    </div>
                  </div>
                  <Button type='submit' disabled={isSubmittingCode} className='w-full'>
                    {isSubmittingCode ? (
                      <div className='flex items-center gap-2'>
                        <Clock className='h-4 w-4 animate-spin' />
                        <span>Applying...</span>
                      </div>
                    ) : (
                      'Apply Code'
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className='bg-muted/50 border-t px-6 py-4 text-sm text-muted-foreground'></CardFooter>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent
          value='history'
          className='mt-0 animate-in fade-in-50 slide-in-from-left-5 duration-300'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='h-5 w-5 text-primary' />
                Your Referral History
              </CardTitle>
              <CardDescription>
                Users you have successfully referred to the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className='space-y-3'>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className='h-12 w-full rounded-md' />
                  ))}
                </div>
              ) : referralHistory.length > 0 ? (
                <div className='space-y-3 overflow-hidden'>
                  {referralHistory.map((ref, index) => (
                    <div
                      key={ref.id}
                      className='flex items-center justify-between p-3 rounded-md border bg-card animate-in fade-in-50 slide-in-from-bottom-3 hover:bg-accent/50 cursor-pointer transition-colors'
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => {
                        if (ref.referredUser?.username) {
                          window.location.href = `/users/${ref.referredUser.username}`;
                        }
                      }}>
                      <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary'>
                          <UserPlus className='h-5 w-5' />
                        </div>
                        <div>
                          <p className='font-medium'>
                            {ref.referredUser?.username ||
                              `User ${ref.referredUserId.substring(0, 8)}...`}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Joined{' '}
                            {new Date(ref.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className='h-4 w-4 text-muted-foreground' />
                    </div>
                  ))}
                </div>
              ) : (
                <div className='py-12 flex flex-col items-center justify-center text-center space-y-3 bg-muted/30 rounded-lg border-2 border-dashed'>
                  <div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground'>
                    <Users className='h-6 w-6' />
                  </div>
                  <div className='space-y-1'>
                    <p className='font-medium'>No referrals yet</p>
                    <p className='text-sm text-muted-foreground'>
                      Share your referral code to invite others to join.
                    </p>
                  </div>
                  <Button
                    variant='outline'
                    onClick={() => setActiveTab('my-code')}
                    className='mt-2'>
                    Get Referral Code
                  </Button>
                </div>
              )}
            </CardContent>
            {referralHistory.length > 0 && (
              <CardFooter className='bg-muted/50 border-t px-6 py-4'>
                <div className='w-full space-y-1'>
                  <div className='flex justify-between text-xs text-muted-foreground'>
                    <span>Total Referrals: {referralHistory.length}</span>
                    <span>
                      {referralHistory.length > 0 ? 'Excellent work!' : 'Start sharing your code'}
                    </span>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
