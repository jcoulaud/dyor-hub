import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCreditPackageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  credits?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  solPrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
