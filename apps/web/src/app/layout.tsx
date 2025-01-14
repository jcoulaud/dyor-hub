import { ThemeProvider } from '@/components/theme-provider';
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
  title: 'DYOR Hub - Solana Token Research Platform',
  description: 'Research and analyze Solana tokens with comprehensive data and security insights',
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
