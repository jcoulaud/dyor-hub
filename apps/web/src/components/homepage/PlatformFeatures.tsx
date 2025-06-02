import { Bell, Brain, MessageSquare, Shield, TrendingUp, Trophy } from 'lucide-react';
import { memo } from 'react';

type FeatureCategory = {
  title: string;
  icon: React.ElementType;
  color: string;
  features: string[];
};

const featureCategories: FeatureCategory[] = [
  {
    title: 'Price Predictions & Tracking',
    icon: TrendingUp,
    color: 'emerald',
    features: [
      'Make and track token price predictions',
      'Follow successful traders and their calls',
      'See verified track records and success rates',
      'Get alerts when price targets are hit',
    ],
  },
  {
    title: 'AI-Powered Analysis',
    icon: Brain,
    color: 'blue',
    features: [
      'AI Trading Analysis with market insights',
      'Diamond Hands Analysis',
      'Early Buyers Analysis',
      'Top Traders Analysis and patterns',
    ],
  },
  {
    title: 'Due Diligence Tools',
    icon: Shield,
    color: 'purple',
    features: [
      'Interactive Bubblemaps visualization',
      'Bundle analysis',
      'Risk scoring (smart contract, liquidity, holders, price, etc.)',
      'Top holders and holder history charts',
      'Token security info (dev wallet, first tx, etc.)',
      'Twitter username history checks',
    ],
  },
  {
    title: 'Social Intelligence',
    icon: MessageSquare,
    color: 'amber',
    features: [
      'Real-time Twitter feed integration',
      'Token sentiment analysis',
      'Community discussions on every token',
      'Share insights with verified users',
    ],
  },
  {
    title: 'Gamification & Rewards',
    icon: Trophy,
    color: 'rose',
    features: [
      'Earn badges for contributions',
      'Climb the leaderboards',
      'Build your reputation score',
      'Tip system to reward helpful users',
      'Referral program',
    ],
  },
  {
    title: 'Personal Tools',
    icon: Bell,
    color: 'indigo',
    features: [
      'Create custom watchlists',
      'In-app notifications',
      'Telegram alerts integration',
      'Follow top traders and tokens',
      'Wallet connections',
    ],
  },
];

type CategoryCardProps = {
  category: FeatureCategory;
};

const CategoryCard = memo(({ category }: CategoryCardProps) => {
  const colorStyles = {
    emerald: {
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-400',
      bullet: 'bg-emerald-400',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    blue: {
      gradient: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
      bullet: 'bg-blue-400',
      hoverBorder: 'hover:border-blue-500/50',
    },
    purple: {
      gradient: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      bullet: 'bg-purple-400',
      hoverBorder: 'hover:border-purple-500/50',
    },
    amber: {
      gradient: 'from-amber-500/20 to-amber-600/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      bullet: 'bg-amber-400',
      hoverBorder: 'hover:border-amber-500/50',
    },
    rose: {
      gradient: 'from-rose-500/20 to-rose-600/10',
      border: 'border-rose-500/30',
      icon: 'text-rose-400',
      bullet: 'bg-rose-400',
      hoverBorder: 'hover:border-rose-500/50',
    },
    indigo: {
      gradient: 'from-indigo-500/20 to-indigo-600/10',
      border: 'border-indigo-500/30',
      icon: 'text-indigo-400',
      bullet: 'bg-indigo-400',
      hoverBorder: 'hover:border-indigo-500/50',
    },
  };

  const Icon = category.icon;
  const style = colorStyles[category.color as keyof typeof colorStyles];

  return (
    <div className='group relative h-full'>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.gradient} rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`}
      />

      <div
        className={`relative bg-zinc-900/60 backdrop-blur-sm border ${style.border} ${style.hoverBorder} rounded-2xl p-6 h-full transition-all duration-300 hover:bg-zinc-900/80`}>
        {/* Header with better alignment */}
        <div className='flex items-center gap-3 mb-5'>
          <div
            className={`p-2.5 rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${style.icon}`} />
          </div>
          <h3 className='text-lg font-bold text-white'>{category.title}</h3>
        </div>

        {/* Features list with better bullet points */}
        <ul className='space-y-2.5'>
          {category.features.map((feature, idx) => (
            <li key={idx} className='flex items-start gap-3'>
              <div className={`w-1 h-1 rounded-full ${style.bullet} mt-2 flex-shrink-0`} />
              <span className='text-sm text-zinc-400 leading-relaxed'>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';

export const PlatformFeatures = memo(() => {
  return (
    <div className='relative'>
      {/* Header with adjusted spacing */}
      <div className='text-center mb-8 md:mb-10 mt-12'>
        <h2 className='text-3xl md:text-5xl font-bold text-white mb-8 leading-tight'>
          Everything You Need to DYOR on Solana
        </h2>
      </div>

      {/* Features Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {featureCategories.map((category) => (
          <CategoryCard key={category.title} category={category} />
        ))}
      </div>
    </div>
  );
});

PlatformFeatures.displayName = 'PlatformFeatures';
