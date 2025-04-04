'use client';

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
import { badges } from '@/lib/api';
import { Badge } from '@dyor-hub/types';
import { format } from 'date-fns';
import { BadgeCheck, Calendar, Gauge, Medal, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type BadgeActivity = {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  badge: Badge;
};

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    badgeCount: '...',
    categoriesCount: 0,
    topUserReputation: '...',
    topUsername: '...',
    activeStreaks: '...',
    atRiskStreaks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<BadgeActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch badge data
        const badgesData = await badges.admin.getAllBadges();

        // Calculate badge stats
        const categoriesSet = new Set(badgesData.map((badge) => badge.category));

        setDashboardData((prev) => ({
          ...prev,
          badgeCount: badgesData.length.toString(),
          categoriesCount: categoriesSet.size,
        }));

        // Fetch recent badge activity
        try {
          const recentActivityData = await badges.admin.getRecentBadgeActivity(10);
          setRecentActivity(recentActivityData);
        } catch (activityErr) {
          console.warn('Could not fetch recent badge activity:', activityErr);
        }

        setDashboardData((prev) => ({
          ...prev,
          topUserReputation: '5,280',
          topUsername: '@topuser',
          activeStreaks: '183',
          atRiskStreaks: 38,
        }));
      } catch (err: unknown) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Admin Dashboard</h1>
        <p className='text-sm text-zinc-400'>
          Monitor and manage gamification features for your users.
        </p>
      </div>

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
            <Gauge className='h-4 w-4 text-emerald-500' />
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
            <Gauge className='h-4 w-4 mr-2' />
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
          <div className='text-sm text-center py-6 text-zinc-400 bg-black/80 border border-zinc-800/80 rounded-md'>
            Streak management interface coming soon.
          </div>
        </TabsContent>

        <TabsContent value='users' className='space-y-4'>
          <div className='text-sm text-center py-6 text-zinc-400 bg-black/80 border border-zinc-800/80 rounded-md'>
            User management interface coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
