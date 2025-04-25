import { UserMinimum } from './user';

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  createdAt: string;
  referrer?: UserMinimum;
  referredUser?: UserMinimum;
}

export interface ReferralLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  referralCount: number;
}
