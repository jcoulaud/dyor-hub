'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { streaks } from '@/lib/api';
import { StreakOverview as StreakOverviewTypeBase, TopStreakUsers } from '@dyor-hub/types';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Flame, Medal, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

type TopUsersData = {
  topCurrentStreaks: (TopStreakUsers & { id: string; lastActivityDate: Date | null })[];
  topAllTimeStreaks: (TopStreakUsers & { id: string })[];
};

type StreakOverviewType = StreakOverviewTypeBase & { milestoneCounts: Record<number, number> };

export default function StreaksAdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<StreakOverviewType | null>(null);
  const [topUsers, setTopUsers] = useState<TopUsersData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [overviewData, topUsersData] = await Promise.all([
          streaks.admin.getStreakOverview(),
          streaks.admin.getTopStreakUsers(10),
        ]);
        setOverview(overviewData);
        setTopUsers(topUsersData);
      } catch (err) {
        console.error('Error fetching streak data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load streak data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Streak Management</h1>
      </div>

      {error && (
        <div className='flex items-center gap-2 rounded-md bg-red-400/10 p-4 text-red-400'>
          <AlertCircle className='h-5 w-5' />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className='space-y-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-20 w-full animate-pulse rounded-md bg-zinc-800/80' />
          ))}
        </div>
      ) : (
        <>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <Card className='bg-black/80 border-zinc-800/80'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-zinc-200'>Active Streaks</CardTitle>
                <Flame className='h-4 w-4 text-emerald-500' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-white'>
                  {overview?.activeStreaksCount || 0}
                </div>
                <p className='text-xs text-zinc-400 mt-1'>Users with current streaks</p>
              </CardContent>
            </Card>
            <Card className='bg-black/80 border-zinc-800/80'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-zinc-200'>Streaks at Risk</CardTitle>
                <AlertCircle className='h-4 w-4 text-orange-500' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-white'>
                  {overview?.streaksAtRiskCount || 0}
                </div>
                <p className='text-xs text-zinc-400 mt-1'>Users who may lose their streak today</p>
              </CardContent>
            </Card>
            <Card className='bg-black/80 border-zinc-800/80'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-zinc-200'>
                  Weekly Milestone Users
                </CardTitle>
                <Calendar className='h-4 w-4 text-blue-500' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-white'>
                  {overview?.milestoneCounts[7] || 0}
                </div>
                <p className='text-xs text-zinc-400 mt-1'>Users with 7+ day streaks</p>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <Card className='col-span-1 bg-black/80 border-zinc-800/80'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-zinc-200'>
                  <Flame className='h-5 w-5 text-emerald-500' />
                  <span>Milestone Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {overview &&
                    Object.entries(overview.milestoneCounts).map(([milestone, count]) => (
                      <div key={milestone} className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-500'>
                            {milestone} {parseInt(milestone) === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>
                        <span className='text-sm font-medium text-white'>{count} users</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue='current' className='col-span-1'>
              <TabsList className='grid w-full grid-cols-2 bg-black border border-zinc-800'>
                <TabsTrigger value='current' className='data-[state=active]:bg-zinc-800'>
                  Current Streaks
                </TabsTrigger>
                <TabsTrigger value='alltime' className='data-[state=active]:bg-zinc-800'>
                  All-Time Streaks
                </TabsTrigger>
              </TabsList>

              <TabsContent value='current' className='mt-4'>
                <Card className='bg-black/80 border-zinc-800/80'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-zinc-200'>
                      <Trophy className='h-5 w-5 text-yellow-500' />
                      <span>Top Current Streaks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      {topUsers?.topCurrentStreaks.map(
                        (
                          user: TopStreakUsers & { id: string; lastActivityDate: Date | null },
                          index: number,
                        ) => (
                          <div
                            key={user.id}
                            className='flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/50 p-3'>
                            <div className='flex items-center gap-3'>
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium'>
                                {index + 1}
                              </div>
                              <div>
                                <div className='font-medium text-white'>{user.username}</div>
                                <div className='text-xs text-zinc-400'>
                                  Last active:{' '}
                                  {user.lastActivityDate
                                    ? format(new Date(user.lastActivityDate), 'MMM d, yyyy')
                                    : 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className='flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-500'>
                              <Flame className='h-3 w-3' />
                              <span>{user.currentStreak} days</span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='alltime' className='mt-4'>
                <Card className='bg-black/80 border-zinc-800/80'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-zinc-200'>
                      <Medal className='h-5 w-5 text-yellow-500' />
                      <span>Top All-Time Streaks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      {topUsers?.topAllTimeStreaks.map(
                        (user: TopStreakUsers & { id: string }, index: number) => (
                          <div
                            key={user.id}
                            className='flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/50 p-3'>
                            <div className='flex items-center gap-3'>
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium'>
                                {index + 1}
                              </div>
                              <div className='font-medium text-white'>{user.username}</div>
                            </div>
                            <div className='flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-500'>
                              <Trophy className='h-3 w-3' />
                              <span>{user.longestStreak} days</span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
