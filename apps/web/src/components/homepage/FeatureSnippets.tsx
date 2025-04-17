import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Newspaper, Users } from 'lucide-react';
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

export const FeatureSnippets: React.FC = () => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      {features.map((feature) => {
        const Icon = feature.icon;
        const iconColorClass = {
          blue: 'text-blue-400 bg-blue-500/10 group-hover:bg-blue-500/20',
          purple: 'text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20',
          green: 'text-green-400 bg-green-500/10 group-hover:bg-green-500/20',
        }[feature.color];

        return (
          <Card
            key={feature.title}
            className='relative group h-full bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-xl overflow-hidden hover:bg-zinc-800/30 transition-colors'>
            <CardHeader className='pb-3'>
              <div className='flex items-center mb-2'>
                <div
                  className={`h-10 w-10 rounded-lg ${iconColorClass} flex items-center justify-center mr-3 transition-colors duration-300`}>
                  <Icon className='h-5 w-5' />
                </div>
                <CardTitle className='text-lg font-semibold text-white'>{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className='text-zinc-300 text-sm'>
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
