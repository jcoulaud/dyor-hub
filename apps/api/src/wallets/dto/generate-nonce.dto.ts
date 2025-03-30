import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateNonceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}
