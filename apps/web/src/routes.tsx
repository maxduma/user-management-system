import { Navigate, type RouteObject } from 'react-router';
import { HOME_PATH, RedirectIfAuthenticated, RequireAuth } from './auth/guards';
import { FullPageLoader } from './components/FullPageLoader';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

/**
 * Route table shared by the browser router and the in-memory test router.
 * Pages are code-split: anonymous visitors never download the dashboard and
 * signed-in users never download the auth forms.
 */
export const routes: RouteObject[] = [
  {
    HydrateFallback: FullPageLoader,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: '/sign-up',
                lazy: async () => ({ Component: (await import('./pages/SignUpPage')).SignUpPage }),
              },
              {
                path: '/sign-in',
                lazy: async () => ({ Component: (await import('./pages/SignInPage')).SignInPage }),
              },
            ],
          },
        ],
      },
      {
        // Only signed-in users (the admin) can reach the dashboard.
        element: <RequireAuth />,
        children: [
          { path: '/', element: <Navigate to={HOME_PATH} replace /> },
          {
            element: <AppLayout />,
            children: [
              {
                path: HOME_PATH,
                lazy: async () => ({
                  Component: (await import('./pages/DashboardPage')).DashboardPage,
                }),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./pages/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
];
