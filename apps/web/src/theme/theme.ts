import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#3949ab' },
    secondary: { main: '#00897b' },
    background: { default: '#f5f6fa' },
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
