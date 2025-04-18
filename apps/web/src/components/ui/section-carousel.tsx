import type { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface SectionCarouselProps {
  title: string;
  icon?: ReactNode;
  viewAllLink?: string;
  children: React.ReactNode[];
  options?: EmblaOptionsType;
  className?: string;
  gradient?: string;
  onPageVisible?: (pageIndex: number) => void;
}

export const SectionCarousel: React.FC<SectionCarouselProps> = ({
  title,
  icon,
  viewAllLink,
  children,
  options = { align: 'start', loop: false },
  className = '',
  gradient = 'from-zinc-900/95 via-zinc-800/95 to-zinc-900/95',
  onPageVisible,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...options,
    watchDrag: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const selected = emblaApi.selectedScrollSnap();
      setSelectedIndex(selected);
      setTotalSlides(emblaApi.scrollSnapList().length);
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
      if (onPageVisible) {
        onPageVisible(selected);
      }
    };

    emblaApi.on('select', onSelect);
    // Initial calculation and trigger
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onPageVisible]);

  // Add this useEffect to update totalSlides when children change
  useEffect(() => {
    if (!emblaApi) return;
    // Recalculate total slides and button states when children array changes length
    const currentChildrenCount = React.Children.count(children);
    console.log(`SectionCarousel [${title}]: Children count is ${currentChildrenCount}`); // Log children count
    const slidesLength = emblaApi.scrollSnapList().length;
    console.log(
      `SectionCarousel [${title}]: Current embla scrollSnapList().length is ${slidesLength}`,
    ); // Log embla's count

    // Only update if the length actually changed to avoid unnecessary re-renders
    // Let's also try updating if the direct children count doesn't match totalSlides yet
    if (slidesLength !== totalSlides || currentChildrenCount !== totalSlides) {
      // Use currentChildrenCount as the most reliable source of truth for total slides
      const newTotalSlides = currentChildrenCount;
      console.log(
        `SectionCarousel [${title}]: Updating totalSlides from ${totalSlides} to ${newTotalSlides}`,
      ); // Log update
      setTotalSlides(newTotalSlides);
      // Re-initialize embla if necessary (might help if slide count changes drastically)
      emblaApi.reInit();
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    }
  }, [emblaApi, children, totalSlides, title]);

  return (
    <Card
      className={`h-full border border-zinc-800/50 shadow-lg bg-gradient-to-br ${gradient} backdrop-blur-xl overflow-hidden rounded-xl hover:border-zinc-700/50 transition-all duration-300 ${className}`}>
      <CardHeader className='flex flex-row items-center gap-2 py-3 px-4 border-b border-zinc-800/30'>
        {icon && (
          <span className='flex items-center justify-center p-1 rounded-md bg-zinc-800/70'>
            {icon}
          </span>
        )}
        <CardTitle className='text-lg font-bold text-white tracking-tight truncate'>
          {title}
        </CardTitle>

        <div className='ml-auto flex items-center gap-2 shrink-0'>
          {totalSlides > 1 && (
            <>
              <button
                type='button'
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className='text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/70 hover:bg-zinc-700/70 transition-colors cursor-pointer disabled:cursor-not-allowed'
                aria-label='Previous slide'>
                <ChevronLeft className='h-4 w-4' />
              </button>

              <button
                type='button'
                onClick={scrollNext}
                disabled={!canScrollNext}
                className='text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/70 hover:bg-zinc-700/70 transition-colors cursor-pointer disabled:cursor-not-allowed'
                aria-label='Next slide'>
                <ChevronRight className='h-4 w-4' />
              </button>
            </>
          )}

          {viewAllLink && (
            <a
              href={viewAllLink}
              className='flex items-center gap-1 px-3 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/70 hover:bg-zinc-700/70 rounded-full transition-colors whitespace-nowrap'>
              View all
            </a>
          )}
        </div>
      </CardHeader>

      <CardContent className='p-0 overflow-hidden'>
        <div className='overflow-hidden w-full' ref={emblaRef}>
          <div className='flex'>
            {React.Children.map(children, (child, idx) => (
              <div
                className='min-w-0 w-full flex-[0_0_100%]'
                role='group'
                aria-label={`Slide ${idx + 1}`}>
                {child}
              </div>
            ))}
          </div>
        </div>

        {totalSlides > 1 && (
          <div className='flex justify-center gap-2 mt-2 mb-3'>
            {Array.from({ length: Math.min(totalSlides, 5) }).map((_, idx) => (
              <button
                key={idx}
                type='button'
                className={`p-1 rounded-full transition-all duration-200 cursor-pointer`}
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}>
                <div
                  className={`h-2 w-2 rounded-full transition-all ${
                    selectedIndex === idx ? 'bg-blue-500 w-4' : 'bg-zinc-600 hover:bg-zinc-500'
                  }`}></div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
