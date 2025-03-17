import { Footer } from '@/components/Footer';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'DYOR Hub | Trusted Solana Memecoin Research & Community Platform',
  description:
    'Your trusted platform for Solana memecoin discussions, research, and real-time updates. Connect with verified Twitter users, discover trending tokens, and make informed decisions.',
  keywords:
    'Solana, memecoin, cryptocurrency, token research, crypto community, DYOR, blockchain, token discussions',
  openGraph: {
    title: 'DYOR Hub | Trusted Solana Memecoin Research & Community Platform',
    description:
      'Your trusted platform for Solana memecoin discussions, research, and real-time updates with verified Twitter users.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DYOR Hub | Trusted Solana Memecoin Research & Community Platform',
    description:
      'Your trusted platform for Solana memecoin discussions, research, and real-time updates with verified Twitter users.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={`${poppins.variable}`}>
      <body className='bg-black font-sans antialiased'>
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
      </body>
    </html>
  );
}
