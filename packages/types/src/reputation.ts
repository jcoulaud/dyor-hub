export interface ReductionTier {
  maxPoints: number;
  maxReduction: number;
}

export interface ActivityPointsConfig {
  post: number;
  comment: number;
  upvote: number;
  downvote: number;
  login: number;
  weeklyDecayPercentage: number;
  minWeeklyActivityToPauseReduction: number;
  reductionTiers: {
    bronze: ReductionTier;
    silver: ReductionTier;
    gold: ReductionTier;
    platinum: ReductionTier;
  };
}

export interface UserReputation {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  totalPoints: number;
  weeklyPoints: number;
}

export interface UserReputationTrends {
  totalPoints: number;
  weeklyPoints: number;
  weeklyChange: number;
  lastUpdated: Date | null;
}

export interface LeaderboardResponse {
  users: UserReputation[];
  timestamp: Date;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export enum LeaderboardCategory {
  COMMENTS = 'comments',
  POSTS = 'posts',
  UPVOTES_GIVEN = 'upvotes_given',
  UPVOTES_RECEIVED = 'upvotes_received',
  REPUTATION = 'reputation',
}

export enum LeaderboardTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  score: number;
  previousRank: number | null;
  change: number | null;
}

export interface UserRankEntry {
  category: LeaderboardCategory;
  timeframe: LeaderboardTimeframe;
  rank: number;
  score: number;
  previousRank: number | null;
}
