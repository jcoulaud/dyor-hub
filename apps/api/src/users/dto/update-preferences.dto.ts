import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class UserPreferencesDto {
  @IsEnum(['price', 'marketCap'])
  @IsOptional()
  tokenChartDisplay?: 'price' | 'marketCap';

  @IsBoolean()
  @IsOptional()
  showWalletAddress?: boolean;
}

export class UpdatePreferencesDto {
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences: UserPreferencesDto;
}
