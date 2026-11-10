import { createTheme } from '@mui/material/styles';

/** localStorage keys used by MUI to persist the selected theme mode. */
export const THEME_MODE_STORAGE_KEY = 'ums-theme-mode';
export const COLOR_SCHEME_STORAGE_KEY = 'ums-color-scheme';

/**
 * Light and dark palettes exposed as CSS variables. The active scheme is a
 * class on <html> (`light` / `dark`), so it can be applied before React loads
 * (see public/theme-init.js) and switched without re-rendering every style.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#3949ab' },
        secondary: { main: '#00897b' },
        background: { default: '#f5f6fa', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#8c9eff' },
        secondary: { main: '#4db6ac' },
        background: { default: '#0f1117', paper: '#171a23' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
});
