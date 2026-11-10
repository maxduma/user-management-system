import type { Page } from '@playwright/test';
import { expect, test, useSession } from './fixtures';

const rows = (page: Page) => page.getByTestId('user-row');

test.describe('User management dashboard', () => {
  test('lists 6 users per page with pagination', async ({ page, api, admin }) => {
    for (let i = 0; i < 7; i += 1) await api.createUser(admin.sessionId);
    await page.reload();

    await expect(rows(page)).toHaveCount(6);
    await expect(page.getByText(/^1–6 of \d+$/)).toBeVisible();

    await page.getByRole('button', { name: 'Go to next page' }).click();

    await expect(page).toHaveURL(/\/dashboard\?page=2$/);
    await expect(page.getByText(/^7–\d+ of \d+$/)).toBeVisible();
    expect(await rows(page).count()).toBeGreaterThan(0);
    expect(await rows(page).count()).toBeLessThanOrEqual(6);

    await page.getByRole('button', { name: 'Go to previous page' }).click();
    await expect(page.getByText(/^1–6 of \d+$/)).toBeVisible();
  });

  test('creates a new user', async ({ page, admin: _admin }) => {
    const suffix = Date.now().toString(36);
    await page.getByRole('button', { name: 'New user' }).click();
    const dialog = page.getByRole('dialog', { name: 'New user' });

    await dialog.getByLabel('First name').fill(`Grace${suffix}`);
    await dialog.getByLabel('Last name').fill('Hopper');
    await dialog.getByLabel('Email').fill(`grace-${suffix}@example.com`);
    await dialog.getByLabel(/^Password/).fill('e2e-password');
    await dialog.getByRole('button', { name: 'Create user' }).click();

    await expect(page.getByText('User created')).toBeVisible();
    await expect(dialog).toBeHidden();
    const row = rows(page).filter({ hasText: `Grace${suffix} Hopper` });
    await expect(row).toContainText(`grace-${suffix}@example.com`);
    await expect(row).toContainText('Active');
  });

  test("updates a user's information", async ({ page, api, admin }) => {
    const user = await api.createUser(admin.sessionId);
    await page.reload();

    await page.getByRole('button', { name: `Edit ${user.firstName} ${user.lastName}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit user' });
    await dialog.getByLabel('Last name').fill('Renamed');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('User updated')).toBeVisible();
    await expect(rows(page).filter({ hasText: `${user.firstName} Renamed` })).toBeVisible();
  });

  test('inactive users keep their name and cannot sign in', async ({
    page,
    api,
    admin,
    browser,
  }) => {
    const user = await api.createUser(admin.sessionId);
    await page.reload();
    const fullName = `${user.firstName} ${user.lastName}`;

    // Deactivate through the UI.
    await page.getByRole('button', { name: `Edit ${fullName}` }).click();
    let dialog = page.getByRole('dialog', { name: 'Edit user' });
    await dialog.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Inactive' }).click();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(rows(page).filter({ hasText: fullName })).toContainText('Inactive');

    // Name fields are now locked.
    await page.getByRole('button', { name: `Edit ${fullName}` }).click();
    dialog = page.getByRole('dialog', { name: 'Edit user' });
    await expect(dialog.getByLabel('First name')).toBeDisabled();
    await expect(dialog.getByLabel('Last name')).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // And the user can no longer create a session.
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.goto('/sign-in');
    await other.getByLabel('Email').fill(user.email);
    await other.getByLabel(/^Password/).fill(user.password);
    await other.getByRole('button', { name: 'Sign in' }).click();
    await expect(other.getByText(/account is inactive/i)).toBeVisible();
    await context.close();
  });

  test('deletes a user', async ({ page, api, admin }) => {
    const user = await api.createUser(admin.sessionId);
    await page.reload();
    const fullName = `${user.firstName} ${user.lastName}`;

    await page.getByRole('button', { name: `Delete ${fullName}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete user?' });
    await expect(dialog).toContainText(user.email);
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('User deleted')).toBeVisible();
    await expect(rows(page).filter({ hasText: fullName })).toHaveCount(0);
    expect((await api.getUser(admin.sessionId, user.id)).status()).toBe(404);
  });

  test('admins cannot delete themselves', async ({ page, admin }) => {
    const fullName = `${admin.user.firstName} ${admin.user.lastName}`;

    await expect(page.getByRole('button', { name: `Delete ${fullName}` })).toBeDisabled();
  });

  test('a session that becomes invalid sends the user back to sign-in', async ({ page, api }) => {
    const { sessionId } = await api.signUp();
    await useSession(page, sessionId);
    await expect(page).toHaveURL(/\/dashboard$/);

    // Terminate the session behind the app's back (e.g. from another tab).
    await page.request.delete(`/api/sessions/${sessionId}`, {
      headers: { authorization: `Bearer ${sessionId}` },
    });
    await page.reload();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText(/session has expired/i)).toBeVisible();
  });
});
