import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

const timeframeRegex = /^(\d+)(m|h|d|w|M|y)$/;

export class CreateTokenCallDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @IsNotEmpty()
  targetPrice: number;

  @IsString()
  @IsNotEmpty()
  @Matches(timeframeRegex, {
    message:
      'timeframeDuration must be in format like "15m", "1h", "3d", "2w", "6M", "1y" (m: minutes, h: hours, d: days, w: weeks, M: months, y: years)',
  })
  timeframeDuration: string;
}
