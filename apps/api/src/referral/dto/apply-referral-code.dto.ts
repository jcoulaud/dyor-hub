import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ApplyReferralCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  referralCode: string;
}
