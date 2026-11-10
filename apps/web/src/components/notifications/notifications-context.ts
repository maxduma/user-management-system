import type { AlertColor } from '@mui/material';
import { createContext, useContext } from 'react';

export type Notify = (message: string, severity?: AlertColor) => void;

export const NotificationsContext = createContext<Notify | null>(null);

/** Shows a transient toast (success by default). */
export function useNotify(): Notify {
  const notify = useContext(NotificationsContext);
  if (!notify) throw new Error('useNotify must be used within <NotificationsProvider>');
  return notify;
}
