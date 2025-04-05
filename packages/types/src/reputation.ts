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
}
