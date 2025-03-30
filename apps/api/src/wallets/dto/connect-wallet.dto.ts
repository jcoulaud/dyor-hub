import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectWalletDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}
