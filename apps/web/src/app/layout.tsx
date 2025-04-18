import { Footer } from '@/components/Footer';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SolanaWalletProvider } from '@/providers/wallet-provider';
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
    'Your trusted platform for Solana memecoin insights, discussions, and real-time updates. Connect with verified users, share research, make predictions, and trade smarter.',
  keywords:
    'Solana, memecoin, cryptocurrency, token research, predcrypto community, DYOR, blockchain, token discussions',
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icon1.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'DYOR hub | Trusted Solana Memecoin Research & Community Platform',
    description:
      'Your trusted platform for Solana memecoin insights, discussions, and real-time updates. Connect with verified users, share research, make predictions, and trade smarter.',
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
      'Your trusted platform for Solana memecoin insights, discussions, and real-time updates. Connect with verified users, share research, make predictions, and trade smarter.',
    creator: '@JulienCoulaud',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={`${poppins.variable}`}>
      <body className='bg-black font-sans antialiased' suppressHydrationWarning>
        <PlausibleProvider domain='dyorhub.xyz'>
          <ThemeProvider>
            <AuthProvider>
              <SolanaWalletProvider>
                <Toaster>
                  <div className='flex flex-col min-h-screen w-full'>
                    <Header />
                    <main className='flex-1 flex flex-col w-full'>{children}</main>
                    <Footer />
                  </div>
                </Toaster>
              </SolanaWalletProvider>
            </AuthProvider>
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
