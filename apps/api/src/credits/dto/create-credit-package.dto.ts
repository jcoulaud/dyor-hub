import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCreditPackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  credits: number;

  @IsNumber()
  @Min(0)
  solPrice: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
