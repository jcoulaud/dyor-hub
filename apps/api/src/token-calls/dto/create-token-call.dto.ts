import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

const timeframeRegex = /^(\d+)(d|w|m|y)$/;

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
    message: 'timeframeDuration must be in format like "1d", "3w", "6m", "1y"',
  })
  timeframeDuration: string;
}
