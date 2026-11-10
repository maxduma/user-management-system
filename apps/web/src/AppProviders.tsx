import { CssBaseline, ThemeProvider } from '@mui/material';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import { NotificationsProvider } from './components/notifications/NotificationsProvider';
import { COLOR_SCHEME_STORAGE_KEY, theme, THEME_MODE_STORAGE_KEY } from './theme/theme';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

/** Every provider the app needs; shared by main.tsx and the test harness. */
export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        theme={theme}
        defaultMode="system"
        modeStorageKey={THEME_MODE_STORAGE_KEY}
        colorSchemeStorageKey={COLOR_SCHEME_STORAGE_KEY}
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        <NotificationsProvider>
          <AuthProvider>{children}</AuthProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
