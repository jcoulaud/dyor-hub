export default function Loading() {
  return (
    <div className='bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen'>
      {/* Background Pattern */}
      <div className='fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-900/5 to-transparent pointer-events-none -z-10' />
      <div className='fixed inset-0 opacity-30 pointer-events-none -z-10'>
        <div className='absolute inset-0 bg-[length:60px_60px] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)]' />
      </div>

      <div className='relative flex min-h-screen'>
        {/* Fixed Left Sidebar - Hidden on mobile */}
        <div className='hidden lg:block fixed left-0 top-16 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-700/50 z-10'>
          <div className='h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3'></div>
              <div className='text-zinc-400 text-sm'>Loading...</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className='w-full lg:ml-80'>
          {/* Mobile loading header */}
          <div className='lg:hidden bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-700/50 p-4'>
            <div className='text-center'>
              <div className='animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2'></div>
              <div className='text-zinc-400 text-sm'>Loading...</div>
            </div>
          </div>

          <div className='container mx-auto px-6 py-8 max-w-6xl'>
            <div className='flex items-center justify-center min-h-[400px]'>
              <div className='text-center'>
                <div className='animate-spin h-12 w-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4'></div>
                <div className='text-zinc-300 text-lg font-medium mb-2'>Loading Token Data</div>
                <div className='text-zinc-500 text-sm'>
                  Please wait while we fetch the token information...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
