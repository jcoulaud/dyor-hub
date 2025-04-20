import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTokenCallDto {
  @IsString()
  @IsNotEmpty()
  tokenMintAddress: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @IsNotEmpty()
  targetPrice: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  targetDate: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @MinLength(10, {
    message: 'Explanation must be at least 10 characters long.',
  })
  @IsNotEmpty()
  explanation: string;
}
