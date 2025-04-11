import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

// Define valid sortable fields
export enum LeaderboardSortField {
  ACCURACY_RATE = 'accuracyRate',
  SUCCESSFUL_CALLS = 'successfulCalls',
  TOTAL_CALLS = 'totalCalls',
}

export class LeaderboardQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50) // Limit leaderboard page size
  limit?: number = 25;

  @IsOptional()
  @IsEnum(LeaderboardSortField)
  sortBy?: LeaderboardSortField = LeaderboardSortField.ACCURACY_RATE; // Default sort
}
