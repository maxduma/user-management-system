import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeApi } from './msw/fake-api';
import { renderApp, signedInApi } from './utils/render-app';

const fillSignUp = async (
  user: ReturnType<typeof renderApp>['user'],
  values: { email?: string; password?: string; confirmPassword?: string } = {},
) => {
  await user.type(screen.getByLabelText(/first name/i), 'Ada');
  await user.type(screen.getByLabelText(/last name/i), 'Lovelace');
  await user.type(screen.getByLabelText(/^email/i), values.email ?? 'ada@example.com');
  await user.type(screen.getByLabelText(/^password/i), values.password ?? 'secret-password');
  await user.type(
    screen.getByLabelText(/confirm password/i, { selector: 'input' }),
    values.confirmPassword ?? values.password ?? 'secret-password',
  );
};

describe('Authentication flow', () => {
  it('presents the sign-up page when there is no active session', async () => {
    const { location } = renderApp('/');

    expect(
      await screen.findByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
    expect(location()).toBe('/sign-up');
  });

  it('protects the dashboard from anonymous visitors', async () => {
    const { location } = renderApp('/dashboard');

    await screen.findByRole('heading', { name: /create your account/i });
    expect(location()).toBe('/sign-up');
  });

  it('navigates between the sign-up and sign-in pages', async () => {
    const { user, location } = renderApp('/sign-up');

    await user.click(await screen.findByRole('link', { name: /sign in/i }));
    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    expect(location()).toBe('/sign-in');

    await user.click(screen.getByRole('link', { name: /sign up/i }));
    expect(
      await screen.findByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('checks that both passwords match before calling the sign-up API', async () => {
    const { user, api } = renderApp('/sign-up');
    await screen.findByRole('heading', { name: /create your account/i });

    await fillSignUp(user, { password: 'secret-password', confirmPassword: 'other-password' });
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.requestsTo('POST', '/api/auth/sign-up')).toHaveLength(0);
  });

  it('signs up, establishes a session and forwards to the dashboard', async () => {
    const { user, api, location } = renderApp('/sign-up');
    await screen.findByRole('heading', { name: /create your account/i });

    await fillSignUp(user);
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByTestId('greeting')).toHaveTextContent('Hello Ada');
    expect(location()).toBe('/dashboard');
    const [request] = api.requestsTo('POST', '/api/auth/sign-up');
    expect(request?.body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secret-password',
    });
    const storedSession = window.localStorage.getItem('ums.sessionId');
    expect(storedSession && api.sessions.has(storedSession)).toBe(true);
  });

  it('shows a field error when the e-mail is already registered', async () => {
    const api = new FakeApi();
    api.addUser({ email: 'ada@example.com' });
    const { user } = renderApp('/sign-up', api);
    await screen.findByRole('heading', { name: /create your account/i });

    await fillSignUp(user);
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('signs in and sends the session id with subsequent requests', async () => {
    const api = new FakeApi();
    api.addUser({ firstName: 'Grace', email: 'grace@example.com', password: 'password123' });
    const { user } = renderApp('/sign-in', api);

    await user.type(await screen.findByLabelText(/^email/i), 'grace@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByTestId('greeting')).toHaveTextContent('Hello Grace');
    expect(await screen.findAllByTestId('user-row')).toHaveLength(1);
  });

  it.each([
    ['wrong credentials', 'wrong-password', 'active', /invalid email or password/i],
    ['an inactive account', 'password123', 'inactive', /your account is inactive/i],
  ] as const)('explains a failed sign-in with %s', async (_case, password, status, message) => {
    const api = new FakeApi();
    api.addUser({ email: 'grace@example.com', password: 'password123', status });
    const { user, location } = renderApp('/sign-in', api);

    await user.type(await screen.findByLabelText(/^email/i), 'grace@example.com');
    await user.type(screen.getByLabelText(/^password/i), password);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(location()).toBe('/sign-in');
  });

  it('forwards users with an active session straight to the dashboard', async () => {
    const { api } = signedInApi();
    const { location } = renderApp('/sign-up', api);

    expect(await screen.findByTestId('greeting')).toHaveTextContent('Hello Admin');
    expect(location()).toBe('/dashboard');
  });

  it('discards a stored session the API no longer accepts', async () => {
    window.localStorage.setItem('ums.sessionId', crypto.randomUUID());
    const { location } = renderApp('/dashboard');

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(location()).toBe('/sign-in');
    expect(window.localStorage.getItem('ums.sessionId')).toBeNull();
  });

  it('logs out: terminates the session and returns to the sign-in page', async () => {
    const { api } = signedInApi();
    const sessionId = window.localStorage.getItem('ums.sessionId')!;
    const { user, location } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: /log out/i }));

    expect(await screen.findByText(/you have been signed out/i)).toBeInTheDocument();
    expect(location()).toBe('/sign-in');
    expect(api.requestsTo('DELETE', `/api/sessions/${sessionId}`)).toHaveLength(1);
    expect(api.sessions.has(sessionId)).toBe(false);
    await waitFor(() => expect(window.localStorage.getItem('ums.sessionId')).toBeNull());
  });

  it('renders a 404 page for unknown routes', async () => {
    renderApp('/nope');

    expect(await screen.findByText(/does not exist/i)).toBeInTheDocument();
  });
});
