import { ChartArea, Newspaper, Sparkles, Users } from 'lucide-react';
import { memo } from 'react';

type FeatureColor = 'blue' | 'purple' | 'green';

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  color: FeatureColor;
};

const features: Feature[] = [
  {
    icon: Users,
    title: 'Discuss',
    description:
      'Join memecoin discussions with Twitter-verified users and build a trusted network. Share your research to help others avoid scams.',
    color: 'blue',
  },
  {
    icon: Newspaper,
    title: 'Get Updates',
    description:
      'Get real-time memecoin news and alerts from verified sources. Stay on top of key updates as they happen.',
    color: 'purple',
  },
  {
    icon: ChartArea,
    title: 'Make Predictions',
    description:
      'Make predictions about memecoins and track their progress. Explore all users predictions and see how they stack up.',
    color: 'green',
  },
];

type FeatureCardProps = {
  feature: Feature;
};

const FeatureCard = memo(({ feature }: FeatureCardProps) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-950/20 to-blue-900/10',
      border: 'border-blue-700/20',
      icon: 'text-blue-400',
      glow: 'after:bg-blue-500/5',
      hover: 'hover:border-blue-500/30 hover:shadow-blue-500/10',
    },
    purple: {
      bg: 'from-purple-950/20 to-purple-900/10',
      border: 'border-purple-700/20',
      icon: 'text-purple-400',
      glow: 'after:bg-purple-500/5',
      hover: 'hover:border-purple-500/30 hover:shadow-purple-500/10',
    },
    green: {
      bg: 'from-emerald-950/20 to-emerald-900/10',
      border: 'border-emerald-700/20',
      icon: 'text-emerald-400',
      glow: 'after:bg-emerald-500/5',
      hover: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
    },
  };

  const colors = colorClasses[feature.color];
  const Icon = feature.icon;

  return (
    <div
      className={`relative flex-1 rounded-xl border ${colors.border} overflow-hidden 
        bg-gradient-to-b ${colors.bg} p-6 md:p-7 
        ${colors.hover} hover:shadow-xl
        transition-all duration-300 backdrop-blur-sm
        after:absolute after:rounded-full ${colors.glow} after:opacity-60 after:blur-3xl
        after:w-[200px] after:h-[200px] after:-bottom-[100px] after:-right-[100px] after:z-0`}>
      <div className='relative z-10'>
        <div
          className={`inline-flex items-center justify-center p-3 rounded-xl
          bg-zinc-800/60 border border-zinc-700/30 backdrop-blur-sm
          mb-4 ${colors.icon}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>

        <h3 className='text-lg md:text-xl font-semibold text-white mb-3'>{feature.title}</h3>

        <p className='text-zinc-300'>{feature.description}</p>
      </div>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

export const PlatformFeatures = memo(() => {
  return (
    <div className='relative overflow-hidden rounded-xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/50 shadow-xl'>
      {/* Background effects */}
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none' />
      <div className='absolute inset-0 bg-grid-pattern opacity-[0.03]' />

      <div className='p-8 md:p-10 relative z-10'>
        {/* Header */}
        <div className='flex flex-col items-center text-center mb-12'>
          <div className='inline-flex items-center justify-center p-2 rounded-full bg-zinc-800/70 border border-zinc-700/30 mb-4 backdrop-blur-sm'>
            <Sparkles className='h-6 w-6 text-blue-400 mr-1' />
            <Sparkles className='h-6 w-6 text-emerald-400' />
          </div>
          <h2 className='text-2xl md:text-3xl font-bold text-white mb-2'>Platform Features</h2>
          <p className='text-zinc-400 max-w-xl'>
            Our platform provides essential tools for navigating the Solana memecoin ecosystem
            safely and effectively.
          </p>
        </div>

        {/* Features */}
        <div className='flex flex-col md:flex-row gap-6 items-stretch'>
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3e%3cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23FFFFFF' stroke-width='0.2' opacity='0.2'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23grid)' /%3e%3c/svg%3e");
        }
      `}</style>
    </div>
  );
});

PlatformFeatures.displayName = 'PlatformFeatures';
