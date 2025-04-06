export class UserReputationResponseDto {
  userId: string;
  username: string;
  totalPoints: number;
  weeklyPoints: number;
  weeklyChange?: number;
  lastUpdated?: Date;
}

export class LeaderboardResponseDto {
  users: UserReputationResponseDto[];
  lastUpdated: Date;
}
