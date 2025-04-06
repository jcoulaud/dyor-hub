'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { gamification } from '@/lib/api';
import { UserStreak } from '@dyor-hub/types';
import { format } from 'date-fns';
import { Calendar, Flame, Medal, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StreakPage() {
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<{ days: number; bonus: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const [streakData, milestonesData] = await Promise.all([
          gamification.streaks.getUserStreak(),
          gamification.streaks.getMilestones(),
        ]);

        setUserStreak(streakData);
        setMilestones(milestonesData);
      } catch (err) {
        console.error('Error fetching streak data:', err);
        setError('Failed to load streak data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const getNextMilestone = () => {
    if (!userStreak) return null;

    const currentStreak = userStreak.currentStreak || 0;
    for (const milestone of milestones) {
      if (currentStreak < milestone.days) {
        const daysToGo = milestone.days - currentStreak;
        return { days: milestone.days, daysToGo, bonus: milestone.bonus };
      }
    }

    return null;
  };

  const nextMilestone = getNextMilestone();

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold mb-2'>Activity Streak</h1>
        <p className='text-muted-foreground'>
          Maintain your streak by engaging with the platform daily. Higher streaks earn bonus
          reputation points and unlock badges.
        </p>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <Skeleton className='h-48 rounded-lg' />
          <Skeleton className='h-48 rounded-lg' />
        </div>
      ) : error ? (
        <div className='bg-destructive/10 text-destructive p-4 rounded-lg'>{error}</div>
      ) : (
        <>
          {/* Streak Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Current Streak Card */}
            <div className='bg-gradient-to-br from-orange-500/20 to-red-500/20 p-6 rounded-lg border border-orange-500/30 shadow-sm'>
              <div className='flex items-center mb-4'>
                <Flame className='h-6 w-6 text-orange-500 mr-2' />
                <h2 className='text-xl font-semibold'>Current Streak</h2>
              </div>
              <div className='flex items-center'>
                <span className='text-4xl font-bold text-orange-500'>
                  {userStreak?.currentStreak}
                </span>
                <span className='text-lg ml-2'>days</span>
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>
                {userStreak?.lastActivityDate
                  ? `Last activity: ${format(new Date(userStreak.lastActivityDate), 'MMM d, yyyy')}`
                  : 'No activity recorded yet'}
              </p>

              {nextMilestone && (
                <div className='mt-4 text-sm'>
                  <div className='flex items-center'>
                    <Target className='h-4 w-4 text-orange-400 mr-1' />
                    <span>
                      Next milestone: <strong>{nextMilestone.days} days</strong>
                    </span>
                  </div>
                  <div className='mt-1 flex items-center'>
                    <span className='mr-1'>
                      Only <strong>{nextMilestone.daysToGo} days</strong> to go!
                    </span>
                    <Medal className='h-4 w-4 text-orange-400 ml-1' />
                  </div>
                </div>
              )}
            </div>

            {/* Longest Streak Card */}
            <div className='bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-lg border border-blue-500/30 shadow-sm'>
              <div className='flex items-center mb-4'>
                <Trophy className='h-6 w-6 text-blue-500 mr-2' />
                <h2 className='text-xl font-semibold'>Longest Streak</h2>
              </div>
              <div className='flex items-center'>
                <span className='text-4xl font-bold text-blue-500'>
                  {userStreak?.longestStreak}
                </span>
                <span className='text-lg ml-2'>days</span>
              </div>

              {userStreak?.currentStreak === userStreak?.longestStreak &&
              (userStreak?.currentStreak || 0) > 0 ? (
                <p className='mt-2 text-sm text-blue-400'>
                  You&apos;re currently on your longest streak ever!
                </p>
              ) : (
                <p className='mt-2 text-sm text-muted-foreground'>
                  Can you beat your personal best?
                </p>
              )}

              <div className='mt-4 text-sm'>
                <div className='flex items-center'>
                  <Calendar className='h-4 w-4 text-blue-400 mr-1' />
                  <span>Daily activity is key to maintaining your streak</span>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className='mt-8'>
            <div className='flex items-center mb-4'>
              <Medal className='h-5 w-5 text-primary mr-2' />
              <h2 className='text-xl font-semibold'>Streak Milestones</h2>
            </div>

            <div className='bg-card/50 rounded-lg border p-4 space-y-4'>
              <p className='text-sm text-muted-foreground mb-4'>
                Reach these streak milestones to earn bonus reputation points and unlock badges!
              </p>

              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                {milestones.map((milestone) => {
                  const isAchieved =
                    userStreak && (userStreak.currentStreak || 0) >= milestone.days;

                  return (
                    <div
                      key={milestone.days}
                      className={`p-3 rounded-lg border ${
                        isAchieved
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-card border-muted-foreground/20'
                      }`}>
                      <div className='text-center'>
                        <div className='text-xl font-bold'>{milestone.days}</div>
                        <div className='text-xs uppercase mt-1'>Days</div>

                        <div className='mt-2 text-xs font-medium'>+{milestone.bonus} pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className='bg-gradient-to-r from-blue-950/30 to-indigo-950/30 p-5 rounded-lg border border-blue-900/50 mt-6'>
            <h3 className='text-xl font-medium mb-3'>
              <span className='mr-2'>💡</span>
              Streak Tips
            </h3>
            <ul className='list-none space-y-3 text-sm text-muted-foreground'>
              <li className='flex items-start'>
                <span className='mr-2 text-muted-foreground'>•</span>
                <span>Visit and engage with the platform daily to maintain your streak</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-muted-foreground'>•</span>
                <span>Making posts, commenting, and voting all count as activity</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-muted-foreground'>•</span>
                <span>Your streak will reset if you miss a day of activity</span>
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-muted-foreground'>•</span>
                <span>Longer streaks earn more reputation points over time</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
