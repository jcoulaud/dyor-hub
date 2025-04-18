'use client';

import { HomepageGrid } from '@/components/homepage/HomepageGrid';

export default function Home() {
  return (
    <main className='min-h-screen w-full bg-black relative'>
      <div className='fixed inset-0 backdrop-blur-[100px] pointer-events-none -z-10' />
      <HomepageGrid />
    </main>
  );
}
