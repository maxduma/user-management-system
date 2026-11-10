import { expect, newUserData, test } from './fixtures';

test.describe('Sign-up / sign-in', () => {
  test('visitors without a session are presented the sign-up page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('only signed-in users can open the dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test('users can navigate between sign-up and sign-in', async ({ page }) => {
    await page.goto('/sign-up');

    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test('both password inputs must match before sign-up is called', async ({ page }) => {
    const signUpCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/sign-up')) signUpCalls.push(request.url());
    });
    const user = newUserData();
    await page.goto('/sign-up');

    await page.getByLabel('First name').fill(user.firstName);
    await page.getByLabel('Last name').fill(user.lastName);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel(/^Password/).fill(user.password);
    await page.getByLabel(/^Confirm password/).fill('something-else');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(signUpCalls).toHaveLength(0);
  });

  test('sign-up establishes a session and forwards to the dashboard', async ({ page }) => {
    const user = newUserData();
    await page.goto('/sign-up');

    await page.getByLabel('First name').fill(user.firstName);
    await page.getByLabel('Last name').fill(user.lastName);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel(/^Password/).fill(user.password);
    await page.getByLabel(/^Confirm password/).fill(user.password);
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('greeting')).toHaveText(`Hello ${user.firstName}`);

    // The session survives a reload (the app is re-opened).
    await page.reload();
    await expect(page.getByTestId('greeting')).toHaveText(`Hello ${user.firstName}`);
  });

  test('an existing user can sign in', async ({ page, api }) => {
    const { user } = await api.signUp();
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel(/^Password/).fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('greeting')).toHaveText(`Hello ${user.firstName}`);
  });

  test('wrong credentials are rejected', async ({ page, api }) => {
    const { user } = await api.signUp();
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel(/^Password/).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('log out finishes the session and returns to the login page', async ({
    page,
    api,
    admin,
  }) => {
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText('You have been signed out.')).toBeVisible();
    // The session was terminated on the server, not just forgotten locally.
    expect((await api.currentSession(admin.sessionId)).status()).toBe(401);

    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });
});
