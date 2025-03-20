import { Footer } from '@/components/Footer';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import type { Metadata } from 'next';
import PlausibleProvider from 'next-plausible';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'DYOR hub | Trusted Solana Memecoin Research & Community Platform',
  description:
    'Your trusted platform for Solana memecoin discussions, research, and real-time updates. Connect with verified Twitter users, discover trending tokens, and make informed decisions.',
  keywords:
    'Solana, memecoin, cryptocurrency, token research, crypto community, DYOR, blockchain, token discussions',
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#5bbad5',
      },
    ],
  },
  openGraph: {
    title: 'DYOR hub | Trusted Solana Memecoin Research & Community Platform',
    description:
      'Your trusted platform for Solana memecoin discussions, research, and real-time updates. Connect with verified Twitter users, discover trending tokens, and make informed decisions.',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: 'DYOR hub - Solana Memecoin Research Platform',
      },
    ],
    siteName: 'DYOR hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DYOR hub | Trusted Solana Memecoin Research & Community Platform',
    description:
      'Your trusted platform for Solana memecoin discussions, research, and real-time updates. Connect with verified Twitter users, discover trending tokens, and make informed decisions.',
    images: [`${process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'}/twitter-image.png`],
    creator: '@JulienCoulaud',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={`${poppins.variable}`}>
      <body className='bg-black font-sans antialiased'>
        <PlausibleProvider domain='dyorhub.xyz'>
          <ThemeProvider>
            <AuthProvider>
              <Toaster>
                <div className='flex flex-col min-h-screen'>
                  <Header />
                  {children}
                  <Footer />
                </div>
              </Toaster>
            </AuthProvider>
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
