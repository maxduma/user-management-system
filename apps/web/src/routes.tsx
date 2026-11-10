import { Navigate, type RouteObject } from 'react-router';
import { HOME_PATH, RedirectIfAuthenticated, RequireAuth } from './auth/guards';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

/** Route table shared by the browser router and the in-memory test router. */
export const routes: RouteObject[] = [
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/sign-up', element: <SignUpPage /> },
          { path: '/sign-in', element: <SignInPage /> },
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
        children: [{ path: HOME_PATH, element: <DashboardPage /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
