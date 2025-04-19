import type { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface EmblaCarouselProps {
  children: React.ReactNode[];
  options?: EmblaOptionsType;
  className?: string;
  showArrows?: boolean;
  showDots?: boolean;
}

export const EmblaCarousel: React.FC<EmblaCarouselProps> = ({
  children,
  options,
  className = '',
  showArrows = true,
  showDots = true,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className='overflow-hidden rounded-2xl bg-zinc-900/80 shadow-lg'
        ref={emblaRef}
        tabIndex={0}
        aria-roledescription='carousel'>
        <div className='flex'>
          {React.Children.map(children, (child, idx) => (
            <div
              className='min-w-0 flex-[0_0_100%] px-2 py-2'
              role='group'
              aria-roledescription='slide'
              aria-label={`Slide ${idx + 1}`}>
              {child}
            </div>
          ))}
        </div>
      </div>
      {showArrows && (
        <>
          <button
            type='button'
            className='absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-full p-2 shadow border border-zinc-700/40 disabled:opacity-40'
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label='Previous slide'>
            <ChevronLeft className='h-5 w-5 text-white' />
          </button>
          <button
            type='button'
            className='absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-full p-2 shadow border border-zinc-700/40 disabled:opacity-40'
            onClick={() => emblaApi && emblaApi.scrollNext()}
            disabled={!canScrollNext}
            aria-label='Next slide'>
            <ChevronRight className='h-5 w-5 text-white' />
          </button>
        </>
      )}
      {showDots && (
        <div className='flex justify-center gap-2 mt-3'>
          {children.map((_, idx) => (
            <button
              key={idx}
              type='button'
              className={`h-2 w-2 rounded-full transition-all duration-200 ${selectedIndex === idx ? 'bg-blue-500 scale-125' : 'bg-zinc-600'}`}
              onClick={() => scrollTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
