import { expect, test } from './fixtures';

test.describe('Theme customization', () => {
  test('the selected theme is kept when the application is re-opened', async ({
    page,
    browser,
  }) => {
    await page.goto('/sign-in');
    const html = page.locator('html');

    await page.getByRole('button', { name: 'Change theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(html).toHaveClass(/\bdark\b/);

    // Reload the page.
    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);

    // "Close and re-open": a brand-new browser context restored from the saved storage.
    const storageState = await page.context().storageState();
    await page.context().close();
    const reopened = await browser.newContext({ storageState });
    const newPage = await reopened.newPage();
    await newPage.goto('/sign-in');
    await expect(newPage.locator('html')).toHaveClass(/\bdark\b/);

    await newPage.getByRole('button', { name: 'Change theme' }).click();
    await newPage.getByRole('menuitem', { name: 'Light' }).click();
    await expect(newPage.locator('html')).toHaveClass(/\blight\b/);
    await reopened.close();
  });

  test('defaults to the operating system preference', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();

    await page.goto('/sign-in');

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await context.close();
  });
});
