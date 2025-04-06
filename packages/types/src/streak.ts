/**
 * Types related to user streaks
 */

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
}

export interface StreakMilestone {
  days: number;
  bonus: number;
}

export interface StreakMilestonesResponse {
  milestones: StreakMilestone[];
}
