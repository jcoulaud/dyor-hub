import { GiphySearchResponse } from '@dyor-hub/types'; // Import shared type
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GiphyService {
  private readonly apiKey: string;
  private readonly giphyApiBaseUrl = 'https://api.giphy.com/v1/gifs';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GIPHY_API_KEY');
    if (!this.apiKey) {
      throw new Error('GIPHY_API_KEY is not defined in environment variables.');
    }
  }

  async searchGifs(
    query: string,
    limit: number = 24,
    offset: number = 0,
    rating: string = 'pg-13',
    lang: string = 'en',
  ): Promise<GiphySearchResponse> {
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
      rating,
      lang,
    });

    const url = `${this.giphyApiBaseUrl}/search?${searchParams}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Giphy API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data: GiphySearchResponse = await response.json();
      return data;
    } catch {
      throw new HttpException(
        'Failed to fetch GIFs from Giphy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
