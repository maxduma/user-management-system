// Applies the persisted theme before the app bundle loads to avoid a flash of
// the wrong theme. Kept as an external file so the CSP can forbid inline scripts.
(function () {
  try {
    var mode = window.localStorage.getItem('ums-theme-mode') || 'system';
    if (mode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(mode);
  } catch {
    // Storage unavailable: MUI falls back to the system preference.
  }
})();
