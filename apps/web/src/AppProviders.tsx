import { CssBaseline, ThemeProvider } from '@mui/material';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { theme } from './theme/theme';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

/** Every provider the app needs; shared by main.tsx and the test harness. */
export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
