import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'DYOR Hub - A central hub for Solana memecoins',
  description:
    'A central hub for Solana memecoin discussions with verified users. Get reliable information and help others avoid scams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning className={poppins.variable}>
      <head>
        <Script id='handle-ethereum' strategy='beforeInteractive'>
          {`
            if (typeof window !== 'undefined') {
              Object.defineProperty(window, 'ethereum', {
                value: undefined,
                configurable: true
              });
            }
          `}
        </Script>
      </head>
      <body className='min-h-screen bg-black font-sans antialiased'>
        <ThemeProvider>
          <AuthProvider>
            <Toaster>
              <div className='flex min-h-screen flex-col'>
                <Header />
                <main className='flex-1 flex flex-col'>{children}</main>
              </div>
            </Toaster>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
