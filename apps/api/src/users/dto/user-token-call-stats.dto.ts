import { Expose } from 'class-transformer';

export class UserTokenCallStatsDto {
  @Expose()
  totalCalls: number;

  @Expose()
  successfulCalls: number;

  @Expose()
  failedCalls: number;

  @Expose()
  accuracyRate: number;

  @Expose()
  averageGainPercent?: number | null;

  @Expose()
  averageTimeToHitRatio?: number | null;

  @Expose()
  averageMultiplier?: number | null;

  @Expose()
  averageMarketCapAtCallTime?: number | null;
}
