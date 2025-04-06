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

export enum BadgeCategory {
  STREAK = 'streak',
  CONTENT = 'content',
  ENGAGEMENT = 'engagement',
  VOTING = 'voting',
  RECEPTION = 'reception',
  QUALITY = 'quality',
}

export enum BadgeRequirement {
  CURRENT_STREAK = 'current_streak',
  MAX_STREAK = 'max_streak',
  POSTS_COUNT = 'posts_count',
  COMMENTS_COUNT = 'comments_count',
  UPVOTES_RECEIVED_COUNT = 'upvotes_received_count',
  UPVOTES_GIVEN_COUNT = 'upvotes_given_count',
  COMMENTS_RECEIVED_COUNT = 'comments_received_count',
  COMMENT_MIN_UPVOTES = 'comment_min_upvotes',
  POST_MIN_UPVOTES = 'post_min_upvotes',
  TOP_PERCENT_WEEKLY = 'top_percent_weekly',
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
