import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BadgeCategory } from '../../entities';

export class CreateBadgeDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(BadgeCategory)
  category: BadgeCategory;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  requirement: string;

  @IsNumber()
  thresholdValue: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
