import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toast';
import { ReferralHandler } from '@/components/util/ReferralHandler';
import { AuthProvider } from '@/providers/auth-provider';
import { ModalProvider } from '@/providers/modal-provider';
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
  title: 'DYOR hub | The Complete Toolkit for Smarter Trading Decisions',
  description:
    'The Complete Toolkit for Smarter Trading Decisions. One platform with everything you need to make informed decisions in the Solana ecosystem.',
  keywords:
    'Solana, memecoin, cryptocurrency, trading toolkit, token research, crypto community, DYOR, blockchain, smart trading, token analysis',
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
    title: 'DYOR hub | The Complete Toolkit for Smarter Trading Decisions',
    description:
      'The Complete Toolkit for Smarter Trading Decisions. One platform with everything you need to make informed decisions in the Solana ecosystem.',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: 'DYOR hub - The Complete Toolkit for Smarter Trading Decisions',
      },
    ],
    siteName: 'DYOR hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DYOR hub | The Complete Toolkit for Smarter Trading Decisions',
    description:
      'The Complete Toolkit for Smarter Trading Decisions. One platform with everything you need to make informed decisions in the Solana ecosystem.',
    creator: '@JulienCoulaud',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={`${poppins.variable}`}>
      <body className='font-sans antialiased' suppressHydrationWarning>
        <PlausibleProvider domain='dyorhub.xyz'>
          <ThemeProvider>
            <SolanaWalletProvider>
              <AuthProvider>
                <ModalProvider>
                  <ReferralHandler />
                  <Toaster>
                    <div className='flex flex-col min-h-screen w-full'>
                      <Header />
                      <main className='flex-1 flex flex-col w-full relative'>{children}</main>
                    </div>
                  </Toaster>
                </ModalProvider>
              </AuthProvider>
            </SolanaWalletProvider>
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
