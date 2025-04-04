import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BadgeCategory } from '../../entities';

export class UpdateBadgeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BadgeCategory)
  @IsOptional()
  category?: BadgeCategory;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  requirement?: string;

  @IsNumber()
  @IsOptional()
  thresholdValue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
