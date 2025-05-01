import { GiphySearchResponse } from '@dyor-hub/types';
import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { GiphySearchQueryDto } from './dto/giphy-search-query.dto';
import { GiphyService } from './giphy.service';

@Controller('giphy')
export class GiphyController {
  constructor(private readonly giphyService: GiphyService) {}

  @Get('search')
  async searchGifs(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GiphySearchQueryDto,
  ): Promise<GiphySearchResponse> {
    const { query: searchQuery, limit, offset, rating, lang } = query;
    return this.giphyService.searchGifs(
      searchQuery,
      limit,
      offset,
      rating,
      lang,
    );
  }
}
