import { Card } from '@/components/ui/card';
import { MessageSquare, Newspaper, Sparkles, Users } from 'lucide-react';
import React from 'react';

const features = [
  {
    icon: Users,
    title: 'Discuss',
    description:
      'Join conversations about memecoins with Twitter-verified users and build a trusted network of reliable sources.',
    color: 'blue',
  },
  {
    icon: Newspaper,
    title: 'Get Updates',
    description:
      'Find memecoin news and updates from verified sources with real-time notifications and alerts about important developments.',
    color: 'purple',
  },
  {
    icon: MessageSquare,
    title: 'Share Knowledge',
    description:
      'Help others avoid scams by sharing your memecoin research and due diligence with the community of verified users.',
    color: 'green',
  },
];

export const PlatformFeatures: React.FC = () => {
  return (
    <Card className='p-5 bg-zinc-900/40 border-zinc-800/60 overflow-hidden'>
      <div className='flex items-center mb-4'>
        <Sparkles className='h-5 w-5 text-blue-400 mr-2' />
        <h2 className='text-lg font-semibold text-white'>Platform Features</h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {features.map((feature) => {
          const colorClasses = {
            blue: {
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
              text: 'text-blue-400',
            },
            purple: {
              bg: 'bg-purple-500/10',
              border: 'border-purple-500/20',
              text: 'text-purple-400',
            },
            green: {
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
              text: 'text-emerald-400',
            },
          };

          const colors = colorClasses[feature.color as keyof typeof colorClasses];
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className={`relative ${colors.bg} ${colors.border} border rounded-lg p-4`}>
              <div className='flex items-center mb-2'>
                <Icon className={`h-5 w-5 ${colors.text} mr-2`} />
                <h3 className='text-base font-medium text-white'>{feature.title}</h3>
              </div>
              <p className='text-sm text-zinc-400'>{feature.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
