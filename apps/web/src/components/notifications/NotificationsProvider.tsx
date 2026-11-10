import { Alert, type AlertColor, Snackbar } from '@mui/material';
import { type ReactNode, useCallback, useState } from 'react';
import { NotificationsContext } from './notifications-context';

interface Notification {
  key: number;
  message: string;
  severity: AlertColor;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setNotification({ key: Date.now(), message, severity });
  }, []);

  const close = () => setNotification(null);

  return (
    <NotificationsContext.Provider value={notify}>
      {children}
      <Snackbar
        key={notification?.key}
        open={notification !== null}
        autoHideDuration={4000}
        onClose={(_event, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert severity={notification.severity} variant="filled" onClose={close}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationsContext.Provider>
  );
}
