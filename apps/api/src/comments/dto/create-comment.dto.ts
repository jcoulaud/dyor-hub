import { CreateCommentDto as SharedCreateCommentDto } from '@dyor-hub/types';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
