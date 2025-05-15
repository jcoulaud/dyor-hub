import {
  IsJSON,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ChartAnalysisDto {
  @IsString()
  @IsNotEmpty()
  tokenName: string;

  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsString()
  @IsNotEmpty()
  tokenAge: string; // e.g., "3 weeks", "6 months"

  @IsNumber()
  @IsNotEmpty()
  numberOfCandles: number;

  @IsString()
  @IsNotEmpty()
  candleType: string; // e.g., "1H", "4H", "1D"

  @IsJSON()
  @IsNotEmpty()
  ohlcvDataJson: string;

  @IsNumber()
  @IsOptional()
  timeFrom?: number; // Unix timestamp in seconds

  @IsNumber()
  @IsOptional()
  timeTo?: number; // Unix timestamp in seconds

  @IsJSON()
  @IsOptional()
  tradeDataJson?: string;
}
