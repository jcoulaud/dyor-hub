import { ActivityType, PaginatedResult } from '@dyor-hub/types';

export class ActivityUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export class ActivityCommentDto {
  id: string;
  content: string;
  createdAt: string | Date;
  upvotes: number;
  downvotes: number;
  userId: string;
  user?: ActivityUserDto;
  parentId?: string | null;
  isReply: boolean;
  tokenMintAddress?: string;
  parent?: ActivityCommentDto | null;
}

export class ActivityTokenCallDto {
  id: string;
  callTimestamp: string | Date;
  targetDate: string | Date;
  referencePrice: number;
  targetPrice: number;
  referenceSupply?: number | null;
  userId: string;
  user?: ActivityUserDto;
  tokenMintAddress?: string;
}

export class EnrichedActivityDto {
  id: string;
  activityType: ActivityType;
  createdAt: string | Date;
  user: ActivityUserDto;
  comment?: ActivityCommentDto;
  tokenCall?: ActivityTokenCallDto;
}

export class PaginatedFeedResultDto
  implements PaginatedResult<EnrichedActivityDto>
{
  data: EnrichedActivityDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
