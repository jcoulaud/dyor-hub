import { TipContentType } from '@dyor-hub/types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordTipRequestDto {
  @IsNotEmpty()
  @IsString()
  recipientUserId: string;
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  transactionSignature: string;

  @IsNotEmpty()
  @IsEnum(TipContentType)
  contentType: TipContentType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contentId?: string;
}
