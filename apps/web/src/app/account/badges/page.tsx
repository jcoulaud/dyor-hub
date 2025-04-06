'use client';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { gamification } from '@/lib/api';
import { AvailableBadge } from '@dyor-hub/types';
import { Award, BadgeCheck, Clock, Lock, Medal, Star, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BadgesPage() {
  const [badges, setBadges] = useState<AvailableBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        setIsLoading(true);
        gamification.badges.clearBadgesCache();
        const data = await gamification.badges.getAvailableBadges();

        // Fix for badges that should be achieved based on criteria
        const fixedData = data.map((badge) => {
          if (badge.currentValue >= (badge.thresholdValue || 0)) {
            return { ...badge, isAchieved: true };
          }
          if (badge.progress >= 100) {
            return { ...badge, isAchieved: true };
          }
          return badge;
        });

        setBadges(fixedData);
      } catch (err) {
        console.error('Error fetching badges:', err);
        setError('Failed to load badges. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBadges();
  }, []);

  // Category metadata for styling and icons
  const categoryInfo = {
    streak: {
      label: 'Streak',
      description: 'Log in daily to maintain your streak',
      icon: <Clock className='h-5 w-5' />,
      color: 'text-orange-500 stroke-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      gradientFrom: 'from-orange-500/60',
      gradientTo: 'to-orange-500/80',
    },
    content: {
      label: 'Content Creation',
      description: 'Create posts on the platform',
      icon: <Award className='h-5 w-5' />,
      color: 'text-blue-500 stroke-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      gradientFrom: 'from-blue-500/60',
      gradientTo: 'to-blue-500/80',
    },
    engagement: {
      label: 'Community Engagement',
      description: 'Comment on posts and interact with the community',
      icon: <Star className='h-5 w-5' />,
      color: 'text-green-500 stroke-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      gradientFrom: 'from-green-500/60',
      gradientTo: 'to-green-500/80',
    },
    voting: {
      label: 'Voting & Curation',
      description: 'Upvote and curate content',
      icon: <BadgeCheck className='h-5 w-5' />,
      color: 'text-purple-500 stroke-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      gradientFrom: 'from-purple-500/60',
      gradientTo: 'to-purple-500/80',
    },
    reception: {
      label: 'Content Reception',
      description: 'Receive upvotes on your content',
      icon: <Medal className='h-5 w-5' />,
      color: 'text-pink-500 stroke-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      gradientFrom: 'from-pink-500/60',
      gradientTo: 'to-pink-500/80',
    },
    quality: {
      label: 'Quality Contribution',
      description: 'Create high-quality content',
      icon: <Trophy className='h-5 w-5' />,
      color: 'text-yellow-500 stroke-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      gradientFrom: 'from-yellow-500/60',
      gradientTo: 'to-yellow-500/80',
    },
  };

  // Group badges by category and sort them
  const badgesByCategory = () => {
    const result: Record<string, AvailableBadge[]> = {};

    badges.forEach((badge) => {
      if (!result[badge.category]) {
        result[badge.category] = [];
      }
      result[badge.category].push(badge);
    });

    // Sort badges within categories by threshold
    Object.keys(result).forEach((category) => {
      result[category].sort((a, b) => (a.thresholdValue || 0) - (b.thresholdValue || 0));
    });

    return result;
  };

  const grouped = isLoading ? {} : badgesByCategory();

  // Sort categories to have ones with earned badges first
  const sortedCategories = Object.entries(grouped).sort(([, badgesA], [, badgesB]) => {
    const earnedInA = badgesA.filter((b) => b.isAchieved).length;
    const earnedInB = badgesB.filter((b) => b.isAchieved).length;
    // First sort by whether any are earned
    if (earnedInA > 0 && earnedInB === 0) return -1;
    if (earnedInA === 0 && earnedInB > 0) return 1;
    // Then sort by number of earned badges
    return earnedInB - earnedInA;
  });

  if (isLoading) {
    return (
      <div className='max-w-3xl mx-auto space-y-4 px-4'>
        <Skeleton className='h-12 w-3/4' />
        <Skeleton className='h-6 w-full' />
        <div className='h-4' />
        <Skeleton className='h-64 rounded-xl' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-3xl mx-auto p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 shadow-sm'>
        {error}
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold mb-2'>Achievement Badges</h1>
        <p className='text-muted-foreground'>
          Track your progress and earn badges as you contribute to the platform. Badges showcase
          your achievements and level of engagement.
        </p>
      </div>

      {/* Badge categories */}
      <div className='space-y-6'>
        {sortedCategories.map(([category, categoryBadges]) => {
          const info = categoryInfo[category as keyof typeof categoryInfo];
          const earnedInCategory = categoryBadges.filter((b) => b.isAchieved).length;
          const nextUnearned = categoryBadges.find((b) => !b.isAchieved);

          return (
            <section key={category} className='border rounded-xl shadow-sm overflow-hidden'>
              {/* Category header */}
              <div className={`p-3 border-b ${info.bgColor}`}>
                <div className='flex justify-between items-center'>
                  <div className='flex items-center gap-3'>
                    <div className={`bg-background/20 p-2 rounded-full ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <h2 className='text-lg font-semibold'>{info.label}</h2>
                      <p className='text-muted-foreground text-sm'>{info.description}</p>
                    </div>
                  </div>
                  <div className='text-sm font-medium px-2 py-1 rounded-lg bg-background/20'>
                    {earnedInCategory}/{categoryBadges.length} earned
                  </div>
                </div>
              </div>

              <div className='p-3 space-y-4'>
                {/* Badge progress path */}
                <div className='relative py-6'>
                  {/* Progress background */}
                  <div className='absolute h-2 bg-muted/40 top-1/2 -translate-y-1/2 left-0 right-0 rounded-full'></div>

                  {/* Badge nodes */}
                  <div className='flex justify-between items-center relative'>
                    {categoryBadges.map((badge, index) => {
                      const isAchieved = badge.isAchieved;
                      const isNextUp =
                        !isAchieved && !categoryBadges.slice(0, index).some((b) => !b.isAchieved);

                      return (
                        <div
                          key={badge.id}
                          className='flex items-center justify-center w-full relative'>
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center relative z-20
                              ${
                                isAchieved
                                  ? `${info.bgColor} ${info.color} border-2 ${info.borderColor} shadow-sm`
                                  : isNextUp
                                    ? 'bg-background border-2 border-primary/60 text-primary shadow-sm'
                                    : 'bg-muted/80 text-muted-foreground'
                              }
                              transition-all hover:scale-105
                            `}>
                            {isAchieved ? (
                              <BadgeCheck className='h-5 w-5' />
                            ) : isNextUp ? (
                              <span className='text-sm font-semibold'>{badge.thresholdValue}</span>
                            ) : (
                              <Lock className='h-4 w-4' />
                            )}
                          </div>

                          {/* Progress line overlay (achieved) - connect to next badge */}
                          {isAchieved && index < categoryBadges.length - 1 && (
                            <div
                              className={`absolute h-3 ${info.bgColor} right-0 left-1/2 top-1/2 -translate-y-1/2 rounded-full z-10`}
                              style={{ opacity: 0.8 }}></div>
                          )}

                          {/* Progress line overlay (previous achieved) - connect to previous badge */}
                          {isAchieved && index > 0 && (
                            <div
                              className={`absolute h-3 ${info.bgColor} left-0 right-1/2 top-1/2 -translate-y-1/2 rounded-full z-10`}
                              style={{ opacity: 0.8 }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current/next milestones */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {/* Most recent earned badge */}
                  {earnedInCategory > 0 && (
                    <div
                      className={`rounded-lg border ${info.borderColor} ${info.bgColor} p-3 backdrop-blur-sm transition-all`}>
                      <div className='flex items-start justify-between'>
                        <div className='space-y-1'>
                          <div className='text-xs text-muted-foreground'>Latest achievement</div>
                          <div className='font-semibold'>
                            {
                              [...categoryBadges]
                                .filter((b) => b.isAchieved)
                                .sort(
                                  (a, b) => (b.thresholdValue || 0) - (a.thresholdValue || 0),
                                )[0]?.name
                            }
                          </div>
                          <div className='text-xs text-muted-foreground/80 line-clamp-2 mt-1'>
                            {
                              [...categoryBadges]
                                .filter((b) => b.isAchieved)
                                .sort(
                                  (a, b) => (b.thresholdValue || 0) - (a.thresholdValue || 0),
                                )[0]?.description
                            }
                          </div>
                        </div>
                        <div
                          className={`${info.color} p-1.5 rounded-full bg-background/30 shadow-inner`}>
                          <BadgeCheck className='h-5 w-5' />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next milestone to earn */}
                  {nextUnearned && (
                    <div className='rounded-lg border border-muted bg-card p-3 backdrop-blur-sm transition-all'>
                      <div className='space-y-2'>
                        <div className='flex items-start justify-between'>
                          <div className='space-y-1'>
                            <div className='text-xs text-muted-foreground'>Next milestone</div>
                            <div className='font-semibold'>{nextUnearned.name}</div>
                            <div className='text-xs text-muted-foreground/80 line-clamp-2 mt-1'>
                              {nextUnearned.description}
                            </div>
                          </div>
                          <div className='text-muted-foreground p-1.5 rounded-full bg-muted/90 shadow-inner'>
                            <Clock className='h-5 w-5' />
                          </div>
                        </div>

                        {nextUnearned.currentValue > 0 && (
                          <div className='space-y-1'>
                            <div className='flex justify-between text-xs'>
                              <span>
                                {nextUnearned.currentValue} / {nextUnearned.thresholdValue}
                              </span>
                              <span>
                                {Math.min(
                                  Math.round(
                                    (nextUnearned.currentValue /
                                      (nextUnearned.thresholdValue || 1)) *
                                      100,
                                  ),
                                  99,
                                )}
                                %
                              </span>
                            </div>
                            <Progress
                              value={Math.min(
                                (nextUnearned.currentValue / (nextUnearned.thresholdValue || 1)) *
                                  100,
                                99,
                              )}
                              className='h-2 rounded-full overflow-hidden'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Optional: If all badges in category are earned */}
                  {earnedInCategory === categoryBadges.length && earnedInCategory > 0 && (
                    <div className='rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 backdrop-blur-sm transition-all'>
                      <div className='flex items-center gap-3'>
                        <div className='bg-emerald-500/20 p-1.5 rounded-full'>
                          <Trophy className='h-5 w-5 text-emerald-500' />
                        </div>
                        <span className='font-medium text-emerald-500'>
                          All {info.label} badges achieved!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
