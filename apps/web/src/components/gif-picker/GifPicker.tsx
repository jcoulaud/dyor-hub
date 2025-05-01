import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { giphy } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GiphyGifObject } from '@dyor-hub/types';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

interface GifPickerProps {
  onSelect: (url: string, alt: string) => void;
  onClose: () => void;
  className?: string;
}

const GIF_DEBOUNCE_TIME = 350;
const PAGE_LIMIT = 24;

export function GifPicker({ onSelect, onClose, className }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GiphyGifObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [imageLoadStatus, setImageLoadStatus] = useState<
    Record<string, 'loading' | 'loaded' | 'error'>
  >({});

  const [debouncedQuery] = useDebounce(searchQuery, GIF_DEBOUNCE_TIME);

  const fetchGifs = useCallback(async (query: string, currentOffset: number) => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setOffset(0);
      setTotalCount(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await giphy.search(query, currentOffset, PAGE_LIMIT);
      if (!data || !data.data) {
        throw new Error('Invalid response from Giphy API');
      }

      const newImageLoadStatus: Record<string, 'loading' | 'loaded' | 'error'> = {};
      data.data.forEach((gif) => {
        newImageLoadStatus[gif.id] = 'loading';
      });
      setImageLoadStatus(newImageLoadStatus);

      setResults(data.data);
      setOffset(currentOffset);
      setTotalCount(data.pagination.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchGifs(debouncedQuery, 0);
  }, [debouncedQuery, fetchGifs]);

  const handleSelectGif = (gif: GiphyGifObject) => {
    onSelect(gif.images.original.url, gif.title || gif.slug);
  };

  const handleImageLoad = (gifId: string) => {
    setImageLoadStatus((prev) => ({
      ...prev,
      [gifId]: 'loaded',
    }));
  };

  const handleImageError = (gifId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;

    if (target.src.includes('fixed_width')) {
      target.src = results.find((g) => g.id === gifId)?.images.downsized?.url || '';
    } else {
      setImageLoadStatus((prev) => ({
        ...prev,
        [gifId]: 'error',
      }));
    }
  };

  const handlePageChange = (newPage: number) => {
    const newOffset = (newPage - 1) * PAGE_LIMIT;
    setOffset(newOffset);
    fetchGifs(debouncedQuery, newOffset);
  };

  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  return (
    <div
      className={cn(
        'gif-picker bg-[#121212] text-white w-[350px] h-[450px] rounded-lg overflow-hidden flex flex-col border border-zinc-800',
        className,
      )}>
      {/* Header with search */}
      <div className='flex items-center gap-2 px-3 py-3 shrink-0 border-b border-zinc-800'>
        {/* Search Input */}
        <div className='relative flex-1'>
          <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
            <Search className='h-3.5 w-3.5' />
          </div>
          <Input
            type='text'
            placeholder='Search for GIFs...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className='w-full h-9 pl-8 pr-8 bg-[#1e1e1e] border-0 rounded-md text-xs focus-visible:ring-0 focus-visible:ring-offset-0'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 cursor-pointer'
              aria-label='Clear search'>
              <X className='h-3.5 w-3.5' />
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label='Close GIF Picker'
          className='p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer'>
          <X className='h-4 w-4' />
        </button>
      </div>

      {/* Content Area */}
      <div className='flex-1 flex items-center justify-center overflow-hidden'>
        {/* Loader */}
        {isLoading && (
          <div className='flex flex-col items-center justify-center w-full h-full text-gray-400'>
            <div className='animate-spin rounded-full h-6 w-6 border-2 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent'></div>
            <p className='mt-3 text-xs'>Searching...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className='flex flex-col items-center justify-center w-full h-full text-gray-400'>
            <p className='text-red-400 mb-3 text-xs'>{error}</p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fetchGifs(debouncedQuery, 0)}
              className='bg-[#1e1e1e] hover:bg-[#2a2a2a] border-zinc-800 text-xs h-8'>
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && results.length === 0 && debouncedQuery.trim() && (
          <div className='flex flex-col items-center justify-center w-full h-full text-gray-400'>
            <p className='mb-1 text-xs'>No results found for &quot;{debouncedQuery}&quot;</p>
            <p className='text-xs text-gray-500'>Try a different search term</p>
          </div>
        )}

        {/* Initial State */}
        {!isLoading && !error && results.length === 0 && !debouncedQuery.trim() && (
          <div className='flex flex-col items-center justify-center w-full h-full text-gray-400'>
            <img
              src='/powered-by-giphy.png'
              alt='Powered by GIPHY'
              className='max-w-[120px] mb-3'
            />
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && !error && results.length > 0 && (
          <div className='w-full h-full px-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
            <div className='grid grid-cols-3 gap-0.5 p-0.5'>
              {results.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelectGif(gif)}
                  className='relative overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 cursor-pointer'
                  aria-label={`Select GIF: ${gif.title || gif.slug}`}>
                  {/* Loading indicator */}
                  {imageLoadStatus[gif.id] !== 'loaded' && (
                    <div className='absolute inset-0 flex items-center justify-center bg-[#1e1e1e]'>
                      <div className='w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin'></div>
                    </div>
                  )}

                  {/* GIF image */}
                  <div className='aspect-square overflow-hidden'>
                    {gif.images.fixed_width && (
                      <img
                        src={gif.images.preview_gif?.url || gif.images.fixed_width_small.url}
                        alt={gif.title || gif.slug}
                        loading='lazy'
                        onLoad={() => handleImageLoad(gif.id)}
                        onError={(e) => handleImageError(gif.id, e)}
                        className={cn(
                          'w-full h-full object-cover',
                          imageLoadStatus[gif.id] === 'loaded' ? 'opacity-100' : 'opacity-0',
                        )}
                        crossOrigin='anonymous'
                      />
                    )}
                  </div>

                  {/* Error fallback */}
                  {imageLoadStatus[gif.id] === 'error' && (
                    <div className='absolute inset-0 flex items-center justify-center bg-[#1e1e1e] text-gray-400 text-[10px]'>
                      Failed to load
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && !error && totalPages > 1 && (
        <div className='py-2 flex justify-center bg-[#121212] border-t border-zinc-800 shrink-0'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
