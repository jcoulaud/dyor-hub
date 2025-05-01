import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'pt',
  'id',
  'fr',
  'ar',
  'tr',
  'th',
  'vi',
  'de',
  'it',
  'ja',
  'zh-CN',
  'zh-TW',
  'ru',
  'ko',
  'pl',
  'nl',
  'ro',
  'hu',
  'sv',
  'cs',
  'hi',
  'bn',
  'da',
  'fa',
  'tl',
  'fi',
  'he',
  'ms',
  'no',
  'uk',
];
const SUPPORTED_RATINGS = ['g', 'pg', 'pg-13', 'r'];

export class GiphySearchQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_RATINGS)
  rating?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES)
  lang?: string;
}
