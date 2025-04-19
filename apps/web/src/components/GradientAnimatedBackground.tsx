import { cn } from '@/lib/utils';
import { memo } from 'react';

export interface GradientAnimatedBackgroundProps {
  className?: string;
  orbCount?: number;
  intensity?: 'low' | 'medium' | 'high';
}

export const GradientAnimatedBackground = memo(
  ({ className, orbCount = 3, intensity = 'medium' }: GradientAnimatedBackgroundProps) => {
    // Calculate opacity based on intensity
    const opacityLevel = intensity === 'low' ? 0.15 : intensity === 'high' ? 0.3 : 0.2;

    return (
      <div className={cn('fixed inset-0 overflow-hidden', className)} style={{ zIndex: -2 }}>
        {/* Dark background base */}
        <div className='absolute inset-0 bg-black'></div>

        {/* Subtle gradient overlay for depth */}
        <div
          className='absolute inset-0'
          style={{
            background:
              'radial-gradient(circle at center, rgba(10,10,20,0.5) 0%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Blue/teal gradient orb - top left */}
        <div
          className='absolute -top-[10%] -left-[10%] w-[800px] h-[800px] rounded-full'
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(20,184,166,0.1) 70%, transparent 100%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Purple gradient orb - right side */}
        <div
          className='absolute top-[20%] right-[0%] w-[600px] h-[600px] rounded-full animate-pulse'
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(91,33,182,0.08) 70%, transparent 100%)',
            filter: 'blur(80px)',
            animationDuration: '15s',
          }}
        />

        {/* Green/blue gradient orb - bottom */}
        <div
          className='absolute -bottom-[10%] right-[20%] w-[700px] h-[700px] rounded-full'
          style={{
            background:
              'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.07) 70%, transparent 100%)',
            filter: 'blur(90px)',
          }}
        />

        {/* Grid pattern overlay for subtle texture */}
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Noise texture overlay */}
        <div className='absolute inset-0 bg-noise opacity-[0.03]' />
      </div>
    );
  },
);

GradientAnimatedBackground.displayName = 'GradientAnimatedBackground';
