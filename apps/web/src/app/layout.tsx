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
  title: 'DYOR Hub - A central hub for Solana memecoins',
  description:
    'A central hub for Solana memecoin discussions with verified users. Get reliable information and help others avoid scams.',
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
