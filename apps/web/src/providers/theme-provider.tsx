'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentPropsWithoutRef } from 'react';

interface ThemeProviderProps extends ComponentPropsWithoutRef<typeof NextThemesProvider> {
  children: React.ReactNode;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='dark'
      enableSystem={false}
      forcedTheme='dark'
      {...props}>
      {children}
    </NextThemesProvider>
  );
}
