import { setupServer } from 'msw/node';

/** Shared MSW server; tests register handlers with `server.use(...)`. */
export const server = setupServer();

/** Absolute URL the app uses for an API path (jsdom origin + /api). */
export const apiUrl = (path: string) => `${window.location.origin}/api${path}`;
