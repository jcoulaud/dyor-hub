'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { leaderboards } from '@/lib/api';
import { LeaderboardCategory, LeaderboardTimeframe } from '@dyor-hub/types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const AdminLeaderboardsPage = () => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await leaderboards.admin.recalculateLeaderboards();
      toast({
        title: 'Leaderboard recalculation triggered',
        description: 'Leaderboards are being recalculated in the background.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error recalculating leaderboards:', error);
      toast({
        title: 'Recalculation failed',
        description: 'There was an error recalculating leaderboards.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Leaderboard Management</h1>
        <Button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className='flex items-center gap-2'>
          <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Recalculating...' : 'Recalculate All Leaderboards'}
        </Button>
      </div>

      <Alert>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          Leaderboards are automatically updated every day at midnight and weekly rankings are reset
          every Sunday. Use the recalculate button to manually trigger an update.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue='categories'>
        <TabsList>
          <TabsTrigger value='categories'>Categories</TabsTrigger>
          <TabsTrigger value='timeframes'>Timeframes</TabsTrigger>
          <TabsTrigger value='notifications'>Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value='categories' className='mt-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Available Categories</CardTitle>
                <CardDescription>
                  Leaderboard categories that are available in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className='space-y-2'>
                  {Object.values(LeaderboardCategory).map((category) => (
                    <li key={category} className='flex items-center gap-2 p-2 border rounded-md'>
                      <span className='font-medium'>{category}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scoring Methods</CardTitle>
                <CardDescription>How scores are calculated for each category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div>
                    <h3 className='text-sm font-semibold mb-1'>{LeaderboardCategory.POSTS}</h3>
                    <p className='text-sm text-gray-500'>
                      Total number of posts created by the user in the selected timeframe.
                    </p>
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold mb-1'>{LeaderboardCategory.COMMENTS}</h3>
                    <p className='text-sm text-gray-500'>
                      Total number of comments made by the user in the selected timeframe.
                    </p>
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold mb-1'>
                      {LeaderboardCategory.UPVOTES_GIVEN}
                    </h3>
                    <p className='text-sm text-gray-500'>
                      Total number of upvotes given to others by the user in the selected timeframe.
                    </p>
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold mb-1'>
                      {LeaderboardCategory.UPVOTES_RECEIVED}
                    </h3>
                    <p className='text-sm text-gray-500'>
                      Total number of upvotes received on the user&apos;s content in the selected
                      timeframe.
                    </p>
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold mb-1'>{LeaderboardCategory.REPUTATION}</h3>
                    <p className='text-sm text-gray-500'>
                      Total reputation points accumulated by the user (weekly or total).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='timeframes' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>Available Timeframes</CardTitle>
              <CardDescription>
                Leaderboard timeframes that are available in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div>
                  <h3 className='text-sm font-semibold mb-1'>{LeaderboardTimeframe.WEEKLY}</h3>
                  <p className='text-sm text-gray-500'>
                    Weekly standings - reset every Sunday at midnight. Shows activity from the last
                    7 days.
                  </p>
                </div>
                <div>
                  <h3 className='text-sm font-semibold mb-1'>{LeaderboardTimeframe.MONTHLY}</h3>
                  <p className='text-sm text-gray-500'>
                    Monthly standings - shows activity from the last 30 days, rolling window.
                  </p>
                </div>
                <div>
                  <h3 className='text-sm font-semibold mb-1'>{LeaderboardTimeframe.ALL_TIME}</h3>
                  <p className='text-sm text-gray-500'>
                    All-time standings - shows activity since user registration, never resets.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='notifications' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>How users are notified about leaderboard changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <p className='mb-4'>Users receive notifications when:</p>
                <ul className='list-disc pl-5 space-y-2'>
                  <li>Their rank improves by 3 or more positions in any leaderboard</li>
                  <li>Weekly leaderboards are reset (happens automatically)</li>
                  <li>They enter the top 10 in any leaderboard for the first time</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <p className='text-sm text-gray-500'>
                Notification settings can be adjusted in the notifications service.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLeaderboardsPage;
