import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ActivityType } from '../../entities';

export class AdjustReputationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  pointsAdjustment: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReputationPointsConfigDto {
  @IsNumber()
  @Min(0)
  postPoints: number;

  @IsNumber()
  @Min(0)
  commentPoints: number;

  @IsNumber()
  @Min(0)
  upvotePoints: number;

  @IsNumber()
  @Min(0)
  downvotePoints: number;

  @IsNumber()
  @Min(0)
  loginPoints: number;

  @IsNumber()
  @Min(0)
  weeklyDecayPercentage: number;
}

export class UserReputationResponseDto {
  userId: string;
  username: string;
  totalPoints: number;
  weeklyPoints: number;
  weeklyChange?: number;
  lastUpdated?: Date;
}

export class ActivityPointsResponseDto {
  points: number;

  @IsEnum(ActivityType)
  activityType: ActivityType;
}

export class LeaderboardResponseDto {
  users: UserReputationResponseDto[];
  lastUpdated: Date;
}
