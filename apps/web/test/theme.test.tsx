import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './utils/render-app';

describe('Theme selection', () => {
  it('switches to dark mode and keeps it after the app is re-opened', async () => {
    const first = renderApp('/sign-in');

    await first.user.click(await screen.findByRole('button', { name: /change theme/i }));
    await first.user.click(await screen.findByRole('menuitem', { name: /dark/i }));

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(window.localStorage.getItem('ums-theme-mode')).toBe('dark');

    // "Close" the app and open it again.
    first.unmount();
    document.documentElement.className = '';
    renderApp('/sign-in');

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    await screen.findByRole('button', { name: /change theme/i });
  });

  it('can switch back to the light theme', async () => {
    window.localStorage.setItem('ums-theme-mode', 'dark');
    const { user } = renderApp('/sign-in');

    await user.click(await screen.findByRole('button', { name: /change theme/i }));
    await user.click(await screen.findByRole('menuitem', { name: /light/i }));

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(window.localStorage.getItem('ums-theme-mode')).toBe('light');
  });

  it('follows the operating system preference by default', async () => {
    renderApp('/sign-in');

    // matchMedia is stubbed to "not dark" in the test setup.
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
  });
});
