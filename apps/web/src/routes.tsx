import { Navigate, type RouteObject } from 'react-router';
import { HOME_PATH, RedirectIfAuthenticated, RequireAuth } from './auth/guards';
import { AuthLayout } from './layouts/AuthLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { WelcomePage } from './pages/WelcomePage';

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
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Navigate to={HOME_PATH} replace /> },
      { path: HOME_PATH, element: <WelcomePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
