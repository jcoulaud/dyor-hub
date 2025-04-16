'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  backfill,
  badges as badgesApi,
  reputation,
  streaks as streaksApi,
  users as usersApi,
} from '@/lib/api';
import { BadgeActivity as ImportedBadgeActivity, TopStreakUsers, User } from '@dyor-hub/types';
import { format } from 'date-fns';
import { BadgeCheck, Calendar, Flame, Medal, RefreshCw, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type DashboardData = {
  badgeCount: string;
  categoriesCount: string;
  activeStreaks: string;
  atRiskStreaks: number;
  topUserReputation: string;
  topUsername: string;
};

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    badgeCount: '...',
    categoriesCount: '0',
    topUserReputation: '...',
    topUsername: '...',
    activeStreaks: '...',
    atRiskStreaks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ImportedBadgeActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topStreakUsers, setTopStreakUsers] = useState<TopStreakUsers[]>([]);
  const [lastRegisteredUsers, setLastRegisteredUsers] = useState<User[]>([]);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Get badge stats
        try {
          const badgesData = await badgesApi.admin.getAllBadges();
          const categories = new Set(badgesData.map((badge) => badge.category));

          setDashboardData((prev) => ({
            ...prev,
            badgeCount: badgesData.length.toString(),
            categoriesCount: categories.size.toString(),
          }));

          // Get recent badge activity
          const badgeActivity = await badgesApi.admin.getRecentBadgeActivity(10);
          setRecentActivity(badgeActivity || []);
        } catch (err) {
          console.error('Error fetching badge data:', err);
          setDashboardData((prev) => ({
            ...prev,
            badgeCount: '0',
            categoriesCount: '0',
          }));
        }

        // Get streak data
        try {
          const streakData = await streaksApi.admin.getStreakOverview();
          const topStreakData = await streaksApi.admin.getTopStreakUsers(10);

          setDashboardData((prev) => ({
            ...prev,
            activeStreaks: streakData.activeStreaksCount.toString(),
            atRiskStreaks: streakData.streaksAtRiskCount,
          }));

          setTopStreakUsers(topStreakData.topCurrentStreaks || []);
        } catch (err) {
          console.error('Error fetching streak data:', err);
          setDashboardData((prev) => ({
            ...prev,
            activeStreaks: '0',
            atRiskStreaks: 0,
          }));
        }

        // Fetch top reputation user data
        try {
          const topReputationUsers = await reputation.getTopUsers(1);
          if (topReputationUsers.users && topReputationUsers.users.length > 0) {
            const topUser = topReputationUsers.users[0];
            setDashboardData((prev) => ({
              ...prev,
              topUserReputation: topUser.totalPoints.toString(),
              topUsername: `@${topUser.username}`,
            }));
          } else {
            // Fallback if no users with reputation
            setDashboardData((prev) => ({
              ...prev,
              topUserReputation: '0',
              topUsername: 'No users yet',
            }));
          }
        } catch (err) {
          console.error('Error fetching reputation data:', err);
          setDashboardData((prev) => ({
            ...prev,
            topUserReputation: '0',
            topUsername: 'Unknown',
          }));
        }

        try {
          const usersData = await usersApi.admin.getLastRegisteredUsers(20);
          setLastRegisteredUsers(usersData || []);
        } catch (err) {
          console.error('Error fetching last registered users:', err);
        }
      } catch (err: unknown) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const handleBackfillClick = async () => {
    setIsBackfilling(true);
    try {
      await backfill.triggerPriceHistoryBackfill();

      toast({
        title: 'Backfill Initiated',
        description: 'Token call price history backfill started. Check server logs for progress.',
      });
    } catch (err) {
      console.error('Error triggering backfill:', err);
      toast({
        variant: 'destructive',
        title: 'Backfill Failed',
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Admin Dashboard</h1>
        <p className='text-sm text-zinc-400'>Monitor and manage gamification features</p>
      </div>

      <Card className='bg-black/80 border-zinc-800/80'>
        <CardHeader>
          <CardTitle className='text-zinc-200 text-sm font-medium'>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleBackfillClick}
            disabled={isBackfilling}
            size='sm'
            className='bg-indigo-600 hover:bg-indigo-500'>
            {isBackfilling ? (
              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <RefreshCw className='mr-2 h-4 w-4' />
            )}
            {isBackfilling ? 'Backfilling...' : 'Backfill Price History'}
          </Button>
          <p className='text-xs text-zinc-400 mt-2'>
            Trigger a background process to fetch and store historical price data for verified token
            calls.
          </p>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='bg-black/80 border-zinc-800/80'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-zinc-200 text-sm font-medium'>Total Badges</CardTitle>
            <BadgeCheck className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>{dashboardData.badgeCount}</div>
            <p className='text-xs text-zinc-400 mt-1'>
              Across {dashboardData.categoriesCount} categories
            </p>
            <div className='mt-4'>
              <Link
                href='/admin/badges'
                className='text-xs text-blue-500 hover:text-blue-400 transition-colors'>
                View badges &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-black/80 border-zinc-800/80'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-zinc-200 text-sm font-medium'>Active Streaks</CardTitle>
            <Flame className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>{dashboardData.activeStreaks}</div>
            <p className='text-xs text-zinc-400 mt-1'>
              {dashboardData.atRiskStreaks} at risk of breaking
            </p>
            <div className='mt-4'>
              <Link
                href='/admin/streaks'
                className='text-xs text-emerald-500 hover:text-emerald-400 transition-colors'>
                Monitor streaks &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-black/80 border-zinc-800/80'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-zinc-200 text-sm font-medium'>Top Reputation</CardTitle>
            <Medal className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>{dashboardData.topUserReputation}</div>
            <p className='text-xs text-zinc-400 mt-1'>By {dashboardData.topUsername}</p>
            <div className='mt-4'>
              <Link
                href='/admin/reputation'
                className='text-xs text-amber-500 hover:text-amber-400 transition-colors'>
                View rankings &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className='p-4 bg-red-500/20 border border-red-500/30 rounded-md'>
          <p className='text-red-400'>{error}</p>
        </div>
      )}

      <Tabs defaultValue='badges' className='space-y-4'>
        <TabsList className='bg-zinc-900/80 border border-zinc-800/80'>
          <TabsTrigger value='badges' className='data-[state=active]:bg-zinc-800'>
            <BadgeCheck className='h-4 w-4 mr-2' />
            Badges
          </TabsTrigger>
          <TabsTrigger value='streaks' className='data-[state=active]:bg-zinc-800'>
            <Flame className='h-4 w-4 mr-2' />
            Streaks
          </TabsTrigger>
          <TabsTrigger value='users' className='data-[state=active]:bg-zinc-800'>
            <Users className='h-4 w-4 mr-2' />
            Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value='badges' className='space-y-4'>
          <Card className='bg-black/80 border-zinc-800/80'>
            <CardHeader>
              <CardTitle className='text-zinc-200'>Recent Badge Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='text-sm text-center py-6 text-zinc-400'>Loading badge data...</div>
              ) : recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Awarded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                            {activity.badge.name}
                          </div>
                        </TableCell>
                        <TableCell>{activity.user.displayName || activity.user.username}</TableCell>
                        <TableCell className='flex items-center gap-2'>
                          <Calendar className='h-3 w-3 text-zinc-400' />
                          {format(new Date(activity.earnedAt), 'MMM d, h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='text-sm text-center py-6 text-zinc-400'>
                  No recent badge activity found. Award some badges to see them here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='streaks' className='space-y-4'>
          <Card className='bg-black/80 border-zinc-800/80'>
            <CardHeader>
              <CardTitle className='text-zinc-200'>Top Active Streaks</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='text-sm text-center py-6 text-zinc-400'>Loading streak data...</div>
              ) : topStreakUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Current Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStreakUsers.slice(0, 5).map((user, index) => (
                      <TableRow key={user.userId}>
                        <TableCell className='font-medium'>#{index + 1}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell className='flex items-center gap-2'>
                          <Flame className='h-3 w-3 text-emerald-500' />
                          <span>{user.currentStreak} days</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='text-sm text-center py-6 text-zinc-400'>
                  No active streaks found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='users' className='space-y-4'>
          <Card className='bg-black/80 border-zinc-800/80'>
            <CardHeader>
              <CardTitle className='text-zinc-200'>Last 20 Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='text-sm text-center py-6 text-zinc-400'>Loading user data...</div>
              ) : lastRegisteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Registered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastRegisteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link
                            href={`/users/${user.username}`}
                            className='hover:underline text-blue-400'>
                            @{user.username}
                          </Link>
                        </TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell className='flex items-center gap-2 text-zinc-400 text-xs'>
                          <Calendar className='h-3 w-3' />
                          {format(new Date(user.createdAt), 'MMM d, yyyy, h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='text-sm text-center py-6 text-zinc-400'>
                  No users registered yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
