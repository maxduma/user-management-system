const KEY = 'ums.sessionId';

/**
 * Persists the session identifier so a returning user (or a reload) keeps
 * their session. Storage access is guarded: it can throw in private modes.
 */
export const sessionStorageKey = {
  get(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(sessionId: string): void {
    try {
      window.localStorage.setItem(KEY, sessionId);
    } catch {
      // Ignore: the session still works for this page lifetime.
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Ignore.
    }
  },
};
