import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';

export class ChartSettingsDto {
  @IsEnum(['price', 'marketCap'])
  @IsOptional()
  tokenChartDisplay?: 'price' | 'marketCap';
}

export class UpdateSettingsDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ChartSettingsDto)
  settings: ChartSettingsDto;
}
