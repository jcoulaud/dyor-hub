import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PurchaseCreditsDto {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;

  @IsNotEmpty()
  @IsString()
  solanaTransactionId: string;
}
