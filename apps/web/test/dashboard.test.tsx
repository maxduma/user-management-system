import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signedInApi } from './utils/render-app';

/** Admin + `count` other users, admin first created (so it is the oldest). */
function apiWithUsers(count: number) {
  const { api, admin } = signedInApi();
  for (let i = 0; i < count; i += 1) api.addUser();
  return { api, admin };
}

const rows = () => screen.findAllByTestId('user-row');

describe('User management dashboard', () => {
  it('lists users 6 per page and paginates through the API', async () => {
    const { api } = apiWithUsers(8);
    const { user, location } = renderApp('/dashboard', api);

    expect(await rows()).toHaveLength(6);
    expect(screen.getByText('1–6 of 9')).toBeInTheDocument();
    expect(screen.getByText('9 users in total')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go to next page/i }));

    await waitFor(() => expect(screen.getByText('7–9 of 9')).toBeInTheDocument());
    expect(await rows()).toHaveLength(3);
    expect(location()).toBe('/dashboard?page=2');
    expect(api.requests.some((r) => r.path === '/api/users' && r.method === 'GET')).toBe(true);
  });

  it('shows user details in each row', async () => {
    const { api } = apiWithUsers(0);
    api.addUser({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      status: 'inactive',
      loginsCount: 7,
    });
    renderApp('/dashboard', api);

    const row = (await screen.findByText('Grace Hopper')).closest('tr')!;
    expect(within(row).getByText('grace@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Inactive')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
  });

  it('redirects to the last existing page', async () => {
    const { api } = apiWithUsers(8);
    const { location } = renderApp('/dashboard?page=9', api);

    await waitFor(() => expect(location()).toBe('/dashboard?page=2'));
    expect(await rows()).toHaveLength(3);
  });

  it('creates a user', async () => {
    const { api } = apiWithUsers(0);
    const { user } = renderApp('/dashboard', api);
    await rows();

    await user.click(screen.getByRole('button', { name: /new user/i }));
    const dialog = await screen.findByRole('dialog', { name: /new user/i });
    await user.type(within(dialog).getByLabelText(/first name/i), 'Linus');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Torvalds');
    await user.type(within(dialog).getByLabelText(/^email/i), 'linus@example.com');
    await user.type(
      within(dialog).getByLabelText(/^password/i, { selector: 'input' }),
      'secret-password',
    );
    await user.click(within(dialog).getByRole('button', { name: /create user/i }));

    expect(await screen.findByText('User created')).toBeInTheDocument();
    expect(await screen.findByText('Linus Torvalds')).toBeInTheDocument();
    expect(api.requestsTo('POST', '/api/users')[0]?.body).toEqual({
      firstName: 'Linus',
      lastName: 'Torvalds',
      email: 'linus@example.com',
      password: 'secret-password',
      status: 'active',
    });
  });

  it('shows API validation problems on the form fields', async () => {
    const { api } = apiWithUsers(0);
    api.addUser({ email: 'taken@example.com' });
    const { user } = renderApp('/dashboard', api);
    await rows();

    await user.click(screen.getByRole('button', { name: /new user/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/first name/i), 'Dup');
    await user.type(within(dialog).getByLabelText(/last name/i), 'User');
    await user.type(within(dialog).getByLabelText(/^email/i), 'taken@example.com');
    await user.type(
      within(dialog).getByLabelText(/^password/i, { selector: 'input' }),
      'secret-password',
    );
    await user.click(within(dialog).getByRole('button', { name: /create user/i }));

    expect(await within(dialog).findByText(/already registered/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits a user, sending only the changed fields', async () => {
    const { api } = apiWithUsers(0);
    const target = api.addUser({ firstName: 'Ken', lastName: 'Thompson' });
    const { user } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: 'Edit Ken Thompson' }));
    const dialog = await screen.findByRole('dialog', { name: /edit user/i });
    const lastName = within(dialog).getByLabelText(/last name/i);
    await user.clear(lastName);
    await user.type(lastName, 'Thompson Jr');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('User updated')).toBeInTheDocument();
    expect(await screen.findByText('Ken Thompson Jr')).toBeInTheDocument();
    expect(api.requestsTo('PATCH', `/api/users/${target.id}`)[0]?.body).toEqual({
      lastName: 'Thompson Jr',
    });
  });

  it('locks the name fields of inactive users', async () => {
    const { api } = apiWithUsers(0);
    api.addUser({ firstName: 'Dennis', lastName: 'Ritchie', status: 'inactive' });
    const { user } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: 'Edit Dennis Ritchie' }));
    const dialog = await screen.findByRole('dialog', { name: /edit user/i });

    expect(within(dialog).getByLabelText(/first name/i)).toBeDisabled();
    expect(within(dialog).getByLabelText(/last name/i)).toBeDisabled();
    expect(within(dialog).getByLabelText(/^email/i)).toBeEnabled();
    expect(within(dialog).getByText(/can only be changed after/i)).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    const { api } = apiWithUsers(0);
    const target = api.addUser({ firstName: 'Barbara', lastName: 'Liskov' });
    const { user } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: 'Delete Barbara Liskov' }));
    const dialog = await screen.findByRole('dialog', { name: /delete user/i });
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText('User deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Barbara Liskov')).not.toBeInTheDocument());
    expect(api.find((u) => u.id === target.id)).toBeUndefined();
  });

  it('can cancel a deletion', async () => {
    const { api } = apiWithUsers(0);
    api.addUser({ firstName: 'Radia', lastName: 'Perlman' });
    const { user } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: 'Delete Radia Perlman' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.requests.some((r) => r.method === 'DELETE')).toBe(false);
  });

  it('prevents admins from deleting or deactivating themselves', async () => {
    const { api } = apiWithUsers(0);
    const { user } = renderApp('/dashboard', api);

    expect(await screen.findByRole('button', { name: 'Delete Admin User' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Edit Admin User' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/cannot deactivate your own account/i)).toBeInTheDocument();
  });

  it('refreshes the greeting when admins rename themselves', async () => {
    const { api } = apiWithUsers(0);
    const { user } = renderApp('/dashboard', api);

    await user.click(await screen.findByRole('button', { name: 'Edit Admin User' }));
    const firstName = within(await screen.findByRole('dialog')).getByLabelText(/first name/i);
    await user.clear(firstName);
    await user.type(firstName, 'Boss');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByTestId('greeting')).toHaveTextContent('Hello Boss'));
  });
});
