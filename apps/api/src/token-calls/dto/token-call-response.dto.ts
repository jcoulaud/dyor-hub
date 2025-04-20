import { TokenCallStatus } from '@dyor-hub/types';
import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TokenDto } from './token.dto';
import { UserDto } from './user.dto';

export class TokenCallResponseDto {
  @IsString()
  @IsNotEmpty()
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  tokenId: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  @Expose()
  callTimestamp: Date;

  @IsNumber()
  @IsNotEmpty()
  @Expose()
  referencePrice: number;

  @IsNumber()
  @IsOptional()
  @Expose()
  referenceSupply?: number | null;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @IsNotEmpty()
  @Expose()
  targetPrice: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  @Expose()
  targetDate: Date;

  @IsEnum(TokenCallStatus)
  @IsNotEmpty()
  @Expose()
  status: TokenCallStatus;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Expose()
  verificationTimestamp?: Date | null;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  @Expose()
  targetHitTimestamp?: Date | null;

  @IsNumber()
  @IsOptional()
  @Expose()
  peakPriceDuringPeriod?: number | null;

  @IsNumber()
  @IsOptional()
  @Expose()
  finalPriceAtTargetDate?: number | null;

  @IsNumber()
  @IsOptional()
  @Expose()
  timeToHitRatio?: number | null;

  @IsString()
  @IsOptional()
  @Expose()
  priceHistoryUrl?: string | null;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  @Expose()
  createdAt: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  @Type(() => TokenDto)
  token: TokenDto;
}
