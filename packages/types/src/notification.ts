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
}

export interface NotificationPreference {
  inApp: boolean;
  email: boolean;
  telegram: boolean;
}
