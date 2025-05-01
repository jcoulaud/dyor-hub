export interface GiphyImageFormat {
  url: string;
  width: string;
  height: string;
  size?: string;
  mp4?: string;
  mp4_size?: string;
  webp?: string;
  webp_size?: string;
}

export interface GiphyImages {
  original: GiphyImageFormat;
  fixed_height: GiphyImageFormat;
  fixed_height_downsampled: GiphyImageFormat;
  fixed_height_small: GiphyImageFormat;
  fixed_width: GiphyImageFormat;
  fixed_width_downsampled: GiphyImageFormat;
  fixed_width_small: GiphyImageFormat;
  downsized: GiphyImageFormat;
  downsized_large: GiphyImageFormat;
  downsized_medium: GiphyImageFormat;
  downsized_small: GiphyImageFormat;
  preview: Pick<GiphyImageFormat, 'mp4' | 'mp4_size' | 'width' | 'height'>;
  preview_gif: Pick<GiphyImageFormat, 'url' | 'size' | 'width' | 'height'>;
  preview_webp: Pick<GiphyImageFormat, 'url' | 'size' | 'width' | 'height'>;
  looping: Pick<GiphyImageFormat, 'mp4' | 'mp4_size'>;
}

export interface GiphyGifObject {
  type: 'gif';
  id: string;
  slug: string;
  url: string;
  bitly_gif_url: string;
  bitly_url: string;
  embed_url: string;
  username: string;
  source: string;
  rating: string;
  content_url: string;
  source_tld: string;
  source_post_url: string;
  is_sticker: number; // 0 or 1
  import_datetime: string;
  trending_datetime: string;
  images: GiphyImages;
  title: string;
  alt_text?: string;
}

export interface GiphySearchResponse {
  data: GiphyGifObject[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}
