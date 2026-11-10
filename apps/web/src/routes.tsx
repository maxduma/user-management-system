import type { RouteObject } from 'react-router';
import { NotFoundPage } from './pages/NotFoundPage';

/** Route table shared by the browser router and the in-memory test router. */
export const routes: RouteObject[] = [{ path: '*', element: <NotFoundPage /> }];
