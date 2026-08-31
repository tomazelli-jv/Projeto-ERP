import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#24587a', dark: '#173e59', light: '#e8f1f7' },
    secondary: { main: '#b96b2c' },
    background: { default: '#f3f5f7', paper: '#ffffff' },
    text: { primary: '#17212b', secondary: '#5d6975' },
    divider: '#dde3e8'
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h1: { fontSize: 'clamp(1.65rem, 4vw, 2rem)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.125rem', fontWeight: 700 },
    button: { fontWeight: 650, textTransform: 'none' }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 38 } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #dde3e8' } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiInputBase: { styleOverrides: { root: { backgroundColor: '#fff' } } },
    MuiMenu: { styleOverrides: { paper: { marginTop: 6, minWidth: 220 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: 320 },
        '*:focus-visible': { outline: '3px solid #8dc4e8', outlineOffset: 2 }
      }
    }
  }
});
