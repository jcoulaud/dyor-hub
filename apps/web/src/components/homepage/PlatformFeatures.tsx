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
      bgGradient: 'from-blue-950 to-blue-900/80',
      iconBg: 'bg-blue-900/40',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-600/20',
      orb: 'bg-blue-500/10',
      glowColor: '#3B82F6',
    },
    purple: {
      bgGradient: 'from-purple-950 to-purple-900/80',
      iconBg: 'bg-purple-900/40',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-600/20',
      orb: 'bg-purple-500/10',
      glowColor: '#8B5CF6',
    },
    green: {
      bgGradient: 'from-emerald-950 to-emerald-900/80',
      iconBg: 'bg-emerald-900/40',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-600/20',
      orb: 'bg-emerald-500/10',
      glowColor: '#10B981',
    },
  };

  const colors = colorClasses[feature.color as FeatureColor];
  const Icon = feature.icon;

  return (
    <div
      className={`relative flex-1 rounded-xl border ${colors.borderColor} overflow-hidden backdrop-blur-sm shadow-lg`}>
      {/* Background layers */}
      <div className='absolute inset-0 bg-black/70' />
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bgGradient} opacity-30`} />

      {/* Gradient orb */}
      <div
        className={`absolute -right-5 -bottom-5 w-48 h-48 rounded-full ${colors.orb} blur-2xl opacity-20`}
      />

      {/* Grid and noise overlay */}
      <div className='absolute inset-0 bg-grid-pattern opacity-[0.03]' />
      <div className='absolute inset-0 bg-noise opacity-[0.02]' />

      {/* Content */}
      <div className='relative z-10 p-6 md:p-7'>
        <div
          className={`inline-flex items-center justify-center p-3 rounded-xl
          ${colors.iconBg} border border-zinc-700/30 backdrop-blur-sm
          mb-4 ${colors.iconColor} shadow-sm`}>
          <Icon className={`h-5 w-5 ${colors.iconColor}`} />
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
    <div className='relative overflow-hidden rounded-xl border border-zinc-800/50 shadow-xl'>
      {/* Layered background */}
      <div className='absolute inset-0 bg-black' />

      {/* Depth effect with staggered gradients */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]' />
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_70%)]' />
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.12),transparent_70%)]' />

      {/* Gradient orbs with animation */}
      <div className='absolute top-[-100px] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-600/5 filter blur-[120px] opacity-60 animate-float-slower' />
      <div className='absolute bottom-[-150px] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/5 filter blur-[120px] opacity-50 animate-float-delayed' />
      <div className='absolute top-[30%] left-[-100px] w-[300px] h-[300px] rounded-full bg-emerald-500/8 filter blur-[100px] opacity-60' />

      {/* Grid pattern with perspective */}
      <div
        className='absolute inset-0 bg-grid-pattern opacity-[0.04]'
        style={{
          backgroundSize: '40px 40px',
          transform: 'perspective(1000px) rotateX(2deg)',
        }}
      />

      {/* Noise texture for added depth */}
      <div className='absolute inset-0 bg-noise opacity-[0.02]' />

      {/* Particle effect */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className='absolute rounded-full opacity-0 animate-twinkle'
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              backgroundColor:
                i % 5 === 0
                  ? 'rgba(96,165,250,0.8)'
                  : i % 5 === 1
                    ? 'rgba(16,185,129,0.8)'
                    : i % 5 === 2
                      ? 'rgba(139,92,246,0.8)'
                      : i % 5 === 3
                        ? 'rgba(236,72,153,0.8)'
                        : 'rgba(255,255,255,0.8)',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${Math.random() * 12 + 4}s`,
              boxShadow: i % 3 === 0 ? '0 0 4px rgba(255,255,255,0.3)' : 'none',
            }}
          />
        ))}
      </div>

      <div className='p-8 md:p-10 relative z-10'>
        {/* Header */}
        <div className='flex flex-col items-center text-center mb-12'>
          <div className='inline-flex items-center justify-center p-2 rounded-full bg-zinc-800/70 border border-zinc-700/30 mb-4 backdrop-blur-sm shadow-xl'>
            <Sparkles className='h-6 w-6 text-blue-400 mr-1' />
            <Sparkles className='h-6 w-6 text-emerald-400' />
          </div>
          <h2 className='text-2xl md:text-3xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white'>
            Platform Features
          </h2>
          <p className='text-zinc-300 max-w-xl'>
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

      {/* Custom animation for orbs */}
      <style jsx>{`
        @keyframes orbFloat {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-15px) translateX(10px);
          }
        }
        .animate-float-slower {
          animation: orbFloat 15s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: orbFloat 12s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
});

PlatformFeatures.displayName = 'PlatformFeatures';
