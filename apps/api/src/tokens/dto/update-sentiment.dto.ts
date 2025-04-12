import { SentimentType } from '@dyor-hub/types';
import { IsEnum } from 'class-validator';

export class UpdateSentimentDto {
  @IsEnum(SentimentType)
  sentimentType: SentimentType;
}
