import { UserMinimum } from './user';

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  createdAt: string;
  referrer?: UserMinimum;
  referredUser?: UserMinimum;
}
