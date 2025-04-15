import { Expose, Type } from 'class-transformer';
import { UserMinimumResponseDto } from '../../users/dto/user-minimum-response.dto';

export class LeaderboardEntryDto {
  @Expose()
  rank: number;

  @Expose()
  @Type(() => UserMinimumResponseDto)
  user: UserMinimumResponseDto;

  @Expose()
  totalCalls: number;

  @Expose()
  successfulCalls: number;

  @Expose()
  accuracyRate: number;

  @Expose()
  averageTimeToHitRatio: number | null;

  @Expose()
  averageMultiplier: number | null;

  @Expose()
  averageMarketCapAtCallTime: number | null;
}
