'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { gamification } from '@/lib/api';
import { AvailableBadge, BadgeRequirement } from '@dyor-hub/types';
import { Award, BadgeCheck, Clock, Lock, Medal, Star, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Helper function to get description based on requirement
const getDescriptionForRequirement = (requirement: BadgeRequirement): string => {
  switch (requirement) {
    case BadgeRequirement.CURRENT_STREAK:
    case BadgeRequirement.MAX_STREAK:
      return 'Log in daily to maintain your streak';
    case BadgeRequirement.POSTS_COUNT:
      return 'Create posts on the platform';
    case BadgeRequirement.COMMENTS_COUNT:
      return 'Comment on posts and interact with the community';
    case BadgeRequirement.VOTES_CAST_COUNT:
      return 'Upvote and curate content';
    case BadgeRequirement.UPVOTES_RECEIVED_COUNT:
      return 'Receive upvotes on your content';
    case BadgeRequirement.COMMENTS_RECEIVED_COUNT:
      return 'Receive replies on your comments';
    case BadgeRequirement.MAX_POST_UPVOTES:
    case BadgeRequirement.MAX_COMMENT_UPVOTES:
      return 'Create high-quality content that gets recognized';
    case BadgeRequirement.TOP_PERCENT_WEEKLY:
      return 'Achieve top ranking on leaderboards';
    default:
      return 'Complete tasks and contribute';
  }
};

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
      icon: <Clock className='h-5 w-5' />,
      color: 'text-orange-500 stroke-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      gradientFrom: 'from-orange-500/60',
      gradientTo: 'to-orange-500/80',
    },
    content: {
      label: 'Content Creation',
      icon: <Award className='h-5 w-5' />,
      color: 'text-blue-500 stroke-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      gradientFrom: 'from-blue-500/60',
      gradientTo: 'to-blue-500/80',
    },
    engagement: {
      label: 'Community Engagement',
      icon: <Star className='h-5 w-5' />,
      color: 'text-green-500 stroke-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      gradientFrom: 'from-green-500/60',
      gradientTo: 'to-green-500/80',
    },
    voting: {
      label: 'Voting & Curation',
      icon: <BadgeCheck className='h-5 w-5' />,
      color: 'text-purple-500 stroke-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      gradientFrom: 'from-purple-500/60',
      gradientTo: 'to-purple-500/80',
    },
    reception: {
      label: 'Content Reception',
      icon: <Medal className='h-5 w-5' />,
      color: 'text-pink-500 stroke-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      gradientFrom: 'from-pink-500/60',
      gradientTo: 'to-pink-500/80',
    },
    quality: {
      label: 'Quality Contribution',
      icon: <Trophy className='h-5 w-5' />,
      color: 'text-yellow-500 stroke-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      gradientFrom: 'from-yellow-500/60',
      gradientTo: 'to-yellow-500/80',
    },
    ranking: {
      label: 'Leaderboard Ranking',
      icon: <Trophy className='h-5 w-5' />,
      color: 'text-teal-500 stroke-teal-500',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      gradientFrom: 'from-teal-500/60',
      gradientTo: 'to-teal-500/80',
    },
  };

  // Group badges by category and then by requirement, and sort them
  const badgesByGroup = useMemo(() => {
    if (isLoading || !badges.length) return {};

    const result: Record<string, Record<string, AvailableBadge[]>> = {};

    badges.forEach((badge) => {
      const categoryKey = badge.category;
      const requirementKey = badge.requirement;

      if (!result[categoryKey]) {
        result[categoryKey] = {};
      }
      if (!result[categoryKey][requirementKey]) {
        result[categoryKey][requirementKey] = [];
      }
      result[categoryKey][requirementKey].push(badge);
    });

    // Sort badges within each category/requirement group by threshold
    Object.values(result).forEach((categoryGroup) => {
      Object.values(categoryGroup).forEach((requirementGroup) => {
        requirementGroup.sort((a, b) => (a.thresholdValue || 0) - (b.thresholdValue || 0));
      });
    });

    return result;
  }, [badges, isLoading]);

  // Sort categories to have ones with earned badges first
  const sortedCategories = useMemo(() => {
    return Object.entries(badgesByGroup).sort(([, reqGroupA], [, reqGroupB]) => {
      const earnedInA = Object.values(reqGroupA)
        .flat()
        .filter((b) => b.isAchieved).length;
      const earnedInB = Object.values(reqGroupB)
        .flat()
        .filter((b) => b.isAchieved).length;
      if (earnedInA > 0 && earnedInB === 0) return -1;
      if (earnedInA === 0 && earnedInB > 0) return 1;
      return earnedInB - earnedInA;
    });
  }, [badgesByGroup]);

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

      {/* Iterate over sorted categories */}
      <div className='space-y-6'>
        {sortedCategories.map(([category, requirementGroups]) => {
          const categoryMeta = categoryInfo[category as keyof typeof categoryInfo];
          if (!categoryMeta) return null; // Skip if no meta info for category

          return (
            <div key={category} className='space-y-4'>
              {/* Iterate over requirement groups within the category */}
              {Object.entries(requirementGroups).map(([requirement, requirementBadges]) => {
                const requirementEnum = requirement as BadgeRequirement;
                const earnedInGroup = requirementBadges.filter((b) => b.isAchieved).length;
                const nextUnearned = requirementBadges.find((b) => !b.isAchieved);
                const description = getDescriptionForRequirement(requirementEnum);

                return (
                  <section
                    key={`${category}-${requirement}`}
                    className='border rounded-xl shadow-sm overflow-hidden'>
                    {/* Requirement group header */}
                    <div className={`p-3 border-b ${categoryMeta.bgColor}`}>
                      <div className='flex justify-between items-center'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`bg-background/20 p-2 rounded-full ${categoryMeta.color}`}>
                            {categoryMeta.icon}
                          </div>
                          <div>
                            <h2 className='text-lg font-semibold'>{categoryMeta.label}</h2>
                            <p className='text-muted-foreground text-sm'>{description}</p>
                          </div>
                        </div>
                        <Badge variant='outline' className='bg-background/30 border-none'>
                          {earnedInGroup}/{requirementBadges.length} earned
                        </Badge>
                      </div>
                    </div>

                    <div className='p-3 space-y-4'>
                      {/* Badge progress path */}
                      <div className='relative py-6'>
                        <div className='absolute h-2 bg-muted/40 top-1/2 -translate-y-1/2 left-0 right-0 rounded-full'></div>
                        <div className='flex justify-between items-center relative'>
                          {/* Render milestone nodes for requirementBadges */}
                          {requirementBadges.map((badge, index) => {
                            const isAchieved = badge.isAchieved;
                            const isNextUp =
                              !isAchieved &&
                              !requirementBadges.slice(0, index).some((b) => !b.isAchieved);
                            return (
                              <div
                                key={badge.id}
                                className='flex items-center justify-center w-full relative group'>
                                <div
                                  className={`
                                    w-10 h-10 rounded-full flex items-center justify-center relative z-20 transition-all hover:scale-105 cursor-help
                                    ${
                                      isAchieved
                                        ? `${categoryMeta.bgColor} ${categoryMeta.color} border-2 ${categoryMeta.borderColor} shadow-sm`
                                        : isNextUp
                                          ? 'bg-background border-2 border-primary/60 text-primary shadow-sm'
                                          : 'bg-muted/80 text-muted-foreground'
                                    }
                                  `}>
                                  {isAchieved ? (
                                    <BadgeCheck className='h-5 w-5' />
                                  ) : isNextUp ? (
                                    <span className='text-sm font-semibold'>
                                      {badge.thresholdValue}
                                    </span>
                                  ) : (
                                    <Lock className='h-4 w-4' />
                                  )}
                                </div>
                                {/* Tooltip for badge name/desc */}
                                <div className='absolute bottom-full mb-2 w-max max-w-xs p-2 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 text-center'>
                                  {badge.name}
                                  <br />
                                  <span className='text-muted-foreground text-[10px]'>
                                    {badge.description}
                                  </span>
                                </div>

                                {/* Progress line overlay (achieved) - connect to next badge */}
                                {isAchieved && index < requirementBadges.length - 1 && (
                                  <div
                                    className={`absolute h-3 ${categoryMeta.bgColor} right-0 left-1/2 top-1/2 -translate-y-1/2 rounded-full z-10`}
                                    style={{ opacity: 0.8 }}></div>
                                )}
                                {/* Progress line overlay (previous achieved) - connect to previous badge */}
                                {isAchieved && index > 0 && (
                                  <div
                                    className={`absolute h-3 ${categoryMeta.bgColor} left-0 right-1/2 top-1/2 -translate-y-1/2 rounded-full z-10`}
                                    style={{ opacity: 0.8 }}></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Next milestone info */}
                      {nextUnearned && (
                        <div className='bg-muted/30 p-3 rounded-lg flex items-center justify-between text-sm'>
                          <div>
                            <p className='text-muted-foreground text-xs mb-0.5'>Next milestone</p>
                            <p className='font-medium'>{nextUnearned.name}</p>
                            <p className='text-muted-foreground text-xs mt-0.5'>
                              {nextUnearned.description}
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='font-semibold text-lg'>
                              {nextUnearned.currentValue}/{nextUnearned.thresholdValue}
                            </p>
                            <Progress value={nextUnearned.progress} className='h-1.5 w-16 mt-1' />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
