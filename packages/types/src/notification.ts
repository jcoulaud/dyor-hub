export enum NotificationType {
  STREAK_AT_RISK = 'streak_at_risk',
  STREAK_ACHIEVED = 'streak_achieved',
  STREAK_BROKEN = 'streak_broken',
  BADGE_EARNED = 'badge_earned',
  LEADERBOARD_CHANGE = 'leaderboard_change',
  REPUTATION_MILESTONE = 'reputation_milestone',
  COMMENT_REPLY = 'comment_reply',
  UPVOTE_RECEIVED = 'upvote_received',
  SYSTEM = 'system',
  TOKEN_CALL_VERIFIED = 'token_call_verified',
  FOLLOWED_USER_PREDICTION = 'followed_user_prediction',
  FOLLOWED_USER_COMMENT = 'followed_user_comment',
  FOLLOWED_USER_VOTE = 'followed_user_vote',
}

export enum NotificationEventType {
  STREAK_AT_RISK = 'streak.at_risk',
  STREAK_MILESTONE = 'streak.milestone',
  STREAK_BROKEN = 'streak.broken',
  BADGE_EARNED = 'badge.earned',
  REPUTATION_MILESTONE = 'reputation.milestone',
  COMMENT_REPLY = 'comment.reply',
  COMMENT_UPVOTED = 'comment.upvoted',
  LEADERBOARD_POSITION_CHANGE = 'leaderboard.position_change',
  TOKEN_CALL_VERIFIED = 'token_call.verified',
  FOLLOWED_USER_PREDICTION = 'followed_user.prediction',
  FOLLOWED_USER_COMMENT = 'followed_user.comment',
  FOLLOWED_USER_VOTE = 'followed_user.vote',
}

export interface NotificationPreference {
  inApp: boolean;
  email: boolean;
  telegram: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  createdAt: string;
  updatedAt: string;
  relatedMetadata?: Record<string, any> | null;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface NotificationBaseData {
  // Common fields for all notification types
}

export interface TokenCallVerifiedData extends NotificationBaseData {
  callId: string;
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  status: 'success' | 'fail';
  targetPrice: number;
  finalPrice?: number | null;
  peakPriceDuringPeriod?: number | null;
  targetHitTimestamp?: string | null;
  timeToHitRatio?: number | null;
}

export interface BadgeUnlockedData extends NotificationBaseData {
  badgeId: string;
  badgeName: string;
  badgeImageUrl: string;
  level?: number;
}

export type NotificationData = BadgeUnlockedData | TokenCallVerifiedData | NotificationBaseData;

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  data: NotificationData;
  title?: string;
  message?: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}
