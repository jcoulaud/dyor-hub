import { z } from 'zod';

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  requirement: BadgeRequirement;
  thresholdValue: number;
  isActive: boolean;
  awardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableBadge extends Omit<Badge, 'awardCount'> {
  progress: number;
  isAchieved: boolean;
  currentValue: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  isDisplayed: boolean;
  badge: {
    id: string;
    name: string;
    description: string;
    category: string;
    imageUrl?: string;
    requirement: string;
    thresholdValue: number;
  };
}

export interface BadgeSummary {
  totalBadges: number;
  byCategory: Record<string, number>;
  recentBadges: UserBadge[];
}

export enum BadgeCategory {
  STREAK = 'streak',
  CONTENT = 'content',
  ENGAGEMENT = 'engagement',
  VOTING = 'voting',
  RECEPTION = 'reception',
  QUALITY = 'quality',
}

export enum BadgeRequirement {
  CURRENT_STREAK = 'CURRENT_STREAK',
  MAX_STREAK = 'MAX_STREAK',
  POSTS_COUNT = 'POSTS_COUNT',
  COMMENTS_COUNT = 'COMMENTS_COUNT',
  UPVOTES_RECEIVED_COUNT = 'UPVOTES_RECEIVED_COUNT',
  VOTES_CAST_COUNT = 'VOTES_CAST_COUNT',
  COMMENTS_RECEIVED_COUNT = 'COMMENTS_RECEIVED_COUNT',
  MAX_COMMENT_UPVOTES = 'MAX_COMMENT_UPVOTES',
  MAX_POST_UPVOTES = 'MAX_POST_UPVOTES',
  TOP_PERCENT_WEEKLY = 'TOP_PERCENT_WEEKLY',
}

export interface CreateBadgeRequest {
  name: string;
  description: string;
  category: BadgeCategory;
  requirement: BadgeRequirement;
  thresholdValue: number;
  isActive: boolean;
}

export interface UpdateBadgeRequest {
  name?: string;
  description?: string;
  category?: BadgeCategory;
  requirement?: BadgeRequirement;
  thresholdValue?: number;
  isActive?: boolean;
}

export interface AwardBadgeRequest {
  userIds: string[];
}

export const BadgeFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Badge name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  category: z.nativeEnum(BadgeCategory),
  requirement: z.nativeEnum(BadgeRequirement),
  thresholdValue: z.coerce.number().int().positive({
    message: 'Threshold must be a positive number.',
  }),
  isActive: z.boolean().default(true),
});

export type BadgeFormValues = z.infer<typeof BadgeFormSchema>;
