import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Globe, ShieldCheck } from 'lucide-react';
import React from 'react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Verified Research',
    description:
      'Access reliable memecoin research from verified sources to make informed investment decisions.',
    color: 'blue' as const,
  },
  {
    icon: Globe,
    title: 'Community Insights',
    description:
      'Connect with a trusted network of verified users sharing real-time updates and discoveries.',
    color: 'purple' as const,
  },
  {
    icon: BarChart3,
    title: 'Token Analytics',
    description:
      'Track memecoin performance with comprehensive analytics, sentiment tracking, and price action.',
    color: 'green' as const,
  },
];

type FeatureColor = 'blue' | 'purple' | 'green';

export const FeatureSnippets: React.FC = () => {
  return (
    <section className='py-6'>
      <h2 className='text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400'>
        Why Choose DYOR Hub
      </h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {features.map((feature) => {
          const Icon = feature.icon;
          const styles = {
            blue: {
              bgGradient: 'from-blue-500/10 to-blue-600/5',
              iconBg: 'bg-blue-500/20',
              iconColor: 'text-blue-400',
              hoverBorder: 'group-hover:border-blue-500/30',
              hoverText: 'group-hover:text-blue-400',
            },
            purple: {
              bgGradient: 'from-purple-500/10 to-purple-600/5',
              iconBg: 'bg-purple-500/20',
              iconColor: 'text-purple-400',
              hoverBorder: 'group-hover:border-purple-500/30',
              hoverText: 'group-hover:text-purple-400',
            },
            green: {
              bgGradient: 'from-emerald-500/10 to-emerald-600/5',
              iconBg: 'bg-emerald-500/20',
              iconColor: 'text-emerald-400',
              hoverBorder: 'group-hover:border-emerald-500/30',
              hoverText: 'group-hover:text-emerald-400',
            },
          };
          const colorStyle = styles[feature.color as FeatureColor];

          return (
            <Card
              key={feature.title}
              className={`group relative overflow-hidden bg-zinc-900/40 border border-zinc-800/60 rounded-xl transition-all duration-300 hover:bg-zinc-900/60 ${colorStyle.hoverBorder}`}>
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${colorStyle.bgGradient} opacity-40`}
              />

              <CardHeader className='pb-2 relative z-10'>
                <div
                  className={`w-10 h-10 rounded-lg ${colorStyle.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-5 w-5 ${colorStyle.iconColor}`} />
                </div>
                <CardTitle
                  className={`text-lg font-medium text-white transition-colors duration-300 ${colorStyle.hoverText}`}>
                  {feature.title}
                </CardTitle>
              </CardHeader>

              <CardContent className='relative z-10'>
                <CardDescription className='text-zinc-400 text-sm'>
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
