/**
 * Interfaces for admin-specific functionality
 */

export interface AdminBadge {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  requirement: string;
  thresholdValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeActivity {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  badge: AdminBadge;
}

export interface TopStreakUsers {
  userId: string;
  username: string;
  currentStreak: number;
  longestStreak: number;
}

export interface StreakOverview {
  activeStreaksCount: number;
  streaksAtRiskCount: number;
  topCurrentStreaks?: TopStreakUsers[];
}
