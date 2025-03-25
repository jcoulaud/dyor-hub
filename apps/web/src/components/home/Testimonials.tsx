'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  initials: string;
  message: string;
  channel: string;
  color: string;
  avatar: string;
}

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20';
      case 'purple':
        return 'from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20';
      case 'green':
        return 'from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20';
      default:
        return 'from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20';
    }
  };

  return (
    <section className='w-full pt-16 pb-24 relative overflow-hidden'>
      <div className='absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30' />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5" />

      <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-4'>
            <MessageSquare className='h-4 w-4 text-blue-400 mr-2' />
            <span className='text-sm font-medium text-zinc-300'>Community Feedback</span>
          </div>
          <h2 className='text-3xl font-bold text-white mb-4'>What Our Users Say</h2>
          <p className='text-zinc-400 max-w-2xl mx-auto'>
            Real feedback from real trenchers using DYOR hub
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto'>
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className={cn(
                'p-8 bg-gradient-to-br backdrop-blur-sm',
                getColorClasses(testimonial.color),
                'border border-white/5',
                'transition-all duration-300',
                'hover:border-white/10 hover:shadow-lg',
              )}>
              <div className='flex flex-col items-center text-center'>
                <Avatar className='h-16 w-16 border-2 border-white/10 mb-4'>
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback className='text-lg'>{testimonial.initials}</AvatarFallback>
                </Avatar>
                <div className='space-y-1 mb-4'>
                  <h3 className='font-semibold text-white text-lg'>{testimonial.name}</h3>
                  <p className='text-sm text-zinc-400'>{testimonial.role}</p>
                </div>
                <div className='relative'>
                  <blockquote className='relative'>
                    <p className='text-base text-zinc-300'>&ldquo;{testimonial.message}&rdquo;</p>
                  </blockquote>
                </div>
                <div className='mt-6 flex items-center justify-center text-xs text-zinc-500'>
                  <MessageSquare className='h-3 w-3 mr-1' />
                  <span>#{testimonial.channel}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
