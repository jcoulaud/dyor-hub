import { ActivityType } from '../../entities';

/**
 * Point values awarded for different activity types
 */
export const ACTIVITY_POINTS = {
  [ActivityType.POST]: 10, // Content creation has higher value
  [ActivityType.COMMENT]: 5, // Engagement through comments
  [ActivityType.UPVOTE]: 2, // Upvoting others' content
  [ActivityType.DOWNVOTE]: 1, // Downvoting counts but less
  [ActivityType.LOGIN]: 1, // Daily logins
};

/**
 * Streak milestone bonus points
 */
export const STREAK_MILESTONE_BONUS = {
  3: 5, // 3-day streak: 5 bonus points
  7: 15, // 7-day streak: 15 bonus points
  14: 30, // 14-day streak: 30 bonus points
  30: 75, // 30-day streak: 75 bonus points
  60: 150, // 60-day streak: 150 bonus points
  100: 300, // 100-day streak: 300 bonus points
  365: 1000, // 365-day streak: 1000 bonus points
};

/**
 * Weekly point reduction percentage (10% of weekly points are reduced each week)
 */
export const WEEKLY_REDUCTION_PERCENTAGE = 10;

/**
 * Minimum weekly activity to pause the reduction
 * If users have at least this many activities in a week, no reduction is applied
 */
export const MIN_WEEKLY_ACTIVITY_TO_PAUSE_REDUCTION = 5;

/**
 * Tiered reduction caps based on total points
 * These values define the maximum points that can be reduced per week for each tier
 */
export const REDUCTION_CAPS = {
  BRONZE: { maxPoints: 500, maxReduction: 25 },
  SILVER: { maxPoints: 2000, maxReduction: 50 },
  GOLD: { maxPoints: 5000, maxReduction: 75 },
  PLATINUM: { maxPoints: Infinity, maxReduction: 100 },
};
