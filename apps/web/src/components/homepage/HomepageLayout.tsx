import { ReactNode, memo } from 'react';

type HomepageLayoutProps = {
  children: ReactNode;
};

export const HomepageLayout = memo(({ children }: HomepageLayoutProps) => {
  return (
    <div className='relative min-h-screen w-full overflow-hidden'>
      {/* Background effects wrapper for entire homepage */}
      <div className='fixed inset-0 -z-10'>
        {/* Darker base background */}
        <div className='absolute inset-0 bg-zinc-950'></div>

        {/* Primary glow gradients */}
        <div className='absolute -top-[200px] -left-[200px] w-[1000px] h-[1000px] bg-gradient-to-r from-blue-600/30 to-emerald-600/20 rounded-full filter blur-[120px] opacity-75 animate-pulse animate-slow'></div>
        <div className='absolute -bottom-[200px] -right-[200px] w-[900px] h-[900px] bg-gradient-to-r from-purple-600/20 to-pink-500/25 rounded-full filter blur-[120px] opacity-80 animate-pulse animate-slower'></div>

        {/* Additional gradients */}
        <div className='absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-gradient-to-r from-emerald-600/20 to-blue-500/15 rounded-full filter blur-[100px] opacity-65 animate-pulse animate-slow'></div>
        <div className='absolute top-1/3 -right-[100px] w-[600px] h-[600px] bg-gradient-to-r from-indigo-600/20 to-purple-600/15 rounded-full filter blur-[100px] opacity-70 animate-pulse animate-slower'></div>

        {/* Center radial gradient for depth */}
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none'></div>
      </div>

      {/* Grid pattern overlay */}
      <div className='fixed inset-0 bg-grid-pattern opacity-[0.07] -z-10'></div>

      {/* Subtle noise texture overlay */}
      <div className='fixed inset-0 bg-noise opacity-[0.04] -z-10'></div>

      {/* Floating particles effect */}
      <div className='fixed inset-0 overflow-hidden -z-10'>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className='absolute rounded-full bg-white opacity-0 animate-float-particle'
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 20 + 15}s`,
            }}></div>
        ))}
      </div>

      {/* Main content */}
      <div className='relative z-10'>{children}</div>

      {/* Styles for animations */}
      <style jsx>{`
        @keyframes float-particle {
          0%,
          100% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          50% {
            opacity: 0.7;
            transform: translateY(-30px) scale(1.2);
          }
        }
        .animate-float-particle {
          animation: float-particle var(--duration, 15s) ease-in-out infinite;
        }
        .animate-slow {
          animation-duration: 10s;
        }
        .animate-slower {
          animation-duration: 15s;
        }
      `}</style>
    </div>
  );
});

HomepageLayout.displayName = 'HomepageLayout';
