import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const ALLOWED_TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y'] as const;
type TimeframeTuple = typeof ALLOWED_TIMEFRAMES;
export type Timeframe = TimeframeTuple[number];

export class AiAnalysisRequestDto {
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_TIMEFRAMES)
  timeframe: Timeframe;
}
