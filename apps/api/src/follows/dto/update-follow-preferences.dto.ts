import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFollowPreferencesDto {
  @IsOptional()
  @IsBoolean()
  prediction?: boolean;

  @IsOptional()
  @IsBoolean()
  comment?: boolean;

  @IsOptional()
  @IsBoolean()
  vote?: boolean;
}
