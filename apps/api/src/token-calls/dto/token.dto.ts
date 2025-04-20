import { Expose } from 'class-transformer';

export class TokenDto {
  @Expose()
  mintAddress: string;

  @Expose()
  name: string;

  @Expose()
  symbol: string;

  @Expose()
  imageUrl: string;
}
