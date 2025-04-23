import { ActivityType } from './user';

export interface ActivityUserData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ActivityCommentData {
  id: string;
  content: string;
  createdAt: string | Date;
  upvotes: number;
  downvotes: number;
  userId: string;
  user?: ActivityUserData;
  parentId?: string | null;
  isReply: boolean;
  tokenMintAddress?: string;
  parent?: ActivityCommentData | null;
}

export interface ActivityTokenCallData {
  id: string;
  callTimestamp: string | Date;
  targetDate: string | Date;
  referencePrice: number | null;
  targetPrice: number | null;
  referenceSupply: number | null;
  userId: string;
  user?: ActivityUserData;
  tokenMintAddress: string;
}

export interface FeedActivity {
  id: string;
  activityType: ActivityType;
  createdAt: string | Date;
  user: ActivityUserData;
  comment?: ActivityCommentData;
  tokenCall?: ActivityTokenCallData;
}

export interface PaginatedFeedResult {
  data: FeedActivity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
