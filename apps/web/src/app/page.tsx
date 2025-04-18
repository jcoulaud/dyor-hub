'use client';

import { Hero } from '@/components/homepage/Hero';
import { HomepageGrid } from '@/components/homepage/HomepageGrid';

export default function Home() {
  return (
    <main className='min-h-screen w-full bg-black'>
      {/* Enhanced background effects - positioned to cover the entire page */}
      <div className='fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,70,50,0.05),transparent_70%)] pointer-events-none -z-10' />

      {/* Subtle grid lines */}
      <div className='fixed inset-0 bg-[url("/grid-pattern.svg")] bg-repeat opacity-[0.02] pointer-events-none -z-10' />

      {/* Animated blur orbs - adjusted positions to ensure they're visible across sections */}
      <div
        className='fixed top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/5 to-transparent rounded-full blur-[120px] animate-pulse pointer-events-none -z-10'
        style={{ animationDuration: '10s' }}
      />
      <div
        className='fixed bottom-1/3 right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-600/5 to-transparent rounded-full blur-[150px] animate-pulse pointer-events-none -z-10'
        style={{ animationDuration: '15s', animationDelay: '2s' }}
      />

      <div className='relative z-0'>
        {/* Hero section */}
        <Hero />

        {/* Main content grid */}
        <HomepageGrid />
      </div>
    </main>
  );
}
