import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyWalletDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
