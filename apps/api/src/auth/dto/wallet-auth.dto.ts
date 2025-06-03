import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WalletSignupDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  avatarUrl: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class WalletLoginDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class CheckWalletDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class LinkAuthMethodDto {
  @IsString()
  @IsNotEmpty()
  provider: 'twitter' | 'wallet';

  @IsString()
  @IsNotEmpty()
  walletAddress?: string;

  @IsString()
  @IsNotEmpty()
  signature?: string;
}
