import { useToast } from '@/hooks/use-toast';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { Copy } from 'lucide-react';
import { memo } from 'react';

export const Hero = memo(() => {
  const { toast } = useToast();

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
      toast({
        title: 'Address Copied',
        description: 'Contract address copied to clipboard',
      });
    });
  };

  return (
    <section className='relative w-full py-6 md:py-8 lg:py-12 overflow-hidden'>
      <div className='container mx-auto px-3 md:px-6 relative z-10'>
        <div className='flex flex-col items-center text-center max-w-4xl mx-auto'>
          <div className='space-y-3 md:space-y-4'>
            {/* Animated badge with full address display */}
            <div
              onClick={handleCopyAddress}
              className='inline-flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-full text-xs font-medium text-zinc-300 animate-fade-in-up w-auto max-w-full overflow-x-auto no-scrollbar hover:bg-zinc-800/50 hover:border-zinc-700 cursor-pointer transition-colors group'>
              <span className='relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1.5 sm:mr-2 flex-shrink-0'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500'></span>
              </span>
              <span className='text-[10px] sm:text-xs whitespace-nowrap flex items-center gap-1.5'>
                {CONTRACT_ADDRESS}
                <Copy className='h-3 w-3 text-zinc-400 group-hover:text-zinc-200 transition-colors flex-shrink-0' />
              </span>
            </div>

            <h1 className='text-2xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white'>
              Your trusted source for Solana memecoin community insights
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = 'Hero';
