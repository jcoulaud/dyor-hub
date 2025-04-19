'use client';

import { GradientAnimatedBackground } from '@/components/GradientAnimatedBackground';
import { Hero } from '@/components/homepage/Hero';
import { HomepageGrid } from '@/components/homepage/HomepageGrid';

export default function Home() {
  return (
    <>
      {/* Subtle gradient background effect */}
      <GradientAnimatedBackground intensity='medium' />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero section */}
        <Hero />

        {/* Main content grid */}
        <HomepageGrid />
      </div>
    </>
  );
}
