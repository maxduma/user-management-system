import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../../src/AppProviders';
import { createQueryClient } from '../../src/query-client';
import { routes } from '../../src/routes';
import { FakeApi } from '../msw/fake-api';
import { server } from '../msw/server';

/** Renders the whole application (real routes and providers) at `path`. */
export function renderApp(path = '/', api = new FakeApi()) {
  server.use(...api.handlers);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const utils = render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  const location = () => `${router.state.location.pathname}${router.state.location.search}`;
  return { ...utils, api, router, user, location };
}

/** A signed-in admin with an active session already stored in localStorage. */
export function signedInApi() {
  const api = new FakeApi();
  const admin = api.addUser({ firstName: 'Admin', lastName: 'User', email: 'admin@example.com' });
  api.signInAs(admin);
  return { api, admin };
}
