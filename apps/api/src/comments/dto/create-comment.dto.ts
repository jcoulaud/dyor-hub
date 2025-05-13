import { CreateCommentDto as SharedCreateCommentDto } from '@dyor-hub/types';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto implements SharedCreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  tokenMintAddress: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  marketCapAtCreation?: number;
}
