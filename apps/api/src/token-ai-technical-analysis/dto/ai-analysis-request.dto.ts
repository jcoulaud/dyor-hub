import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AiAnalysisRequestDto {
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(1)
  timeFrom: number;

  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(1)
  @ValidateIf((o) => o.timeFrom < o.timeTo)
  timeTo: number;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
