'use client';

import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';

type RangeSliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>;

const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(({ className, value, defaultValue, ...props }, ref) => {
  const currentValues = value || defaultValue || [];
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center py-3', className)}
      value={value}
      defaultValue={defaultValue}
      {...props}>
      <SliderPrimitive.Track className='relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-700'>
        <SliderPrimitive.Range className='absolute h-full bg-teal-500' />
      </SliderPrimitive.Track>
      {currentValues.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className='block h-5 w-5 rounded-full border-2 border-teal-500 bg-zinc-900 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab'
        />
      ))}
    </SliderPrimitive.Root>
  );
});
RangeSlider.displayName = SliderPrimitive.Root.displayName;

export { RangeSlider };
