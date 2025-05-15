import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';

export class AiAnalysisRequestDto {
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsNumber()
  @IsInt()
  timeFrom: number;

  @IsNumber()
  @IsInt()
  @ValidateIf((o) => o.timeFrom < o.timeTo)
  timeTo: number;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
