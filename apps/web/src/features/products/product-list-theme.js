import { createTheme } from '@mui/material/styles';

// Paleta local da listagem: reutiliza os componentes e mantém a preferência de tema global.
export function createProductListTheme(base) {
  const dark = base.palette.mode === 'dark';
  const colors = dark
    ? {
        page: base.palette.background.default,
        paper: base.palette.background.paper,
        border: base.palette.divider,
        text: base.palette.text.primary,
        muted: base.palette.text.secondary,
        soft: base.palette.primary.soft,
        accentText: base.palette.primary.dark,
        hover: base.palette.surface.hover,
        success: base.palette.success.main,
        successBg: '#27382A',
        error: base.palette.error.main,
        errorBg: '#412B29'
      }
    : {
        page: '#F5F3EE',
        paper: '#FFFFFF',
        border: '#E8E3D8',
        text: '#27231C',
        muted: '#807A6C',
        soft: '#F0E8D3',
        accentText: '#7A6226',
        hover: '#F8F7F3',
        success: '#3E6B47',
        successBg: '#E6EFE6',
        error: '#9A4A44',
        errorBg: '#F4E3E1'
      };
  return createTheme(base, {
    palette: {
      background: { default: colors.page, paper: colors.paper },
      divider: colors.border,
      text: { primary: colors.text, secondary: colors.muted },
      surface: { secondary: colors.paper, hover: colors.hover },
      // Dark herda o verde oficial para evitar uma segunda paleta divergente.
      primary: dark
        ? base.palette.primary
        : {
            main: '#B5964A',
            soft: colors.soft,
            light: colors.soft,
            dark: colors.accentText,
            border: colors.border,
            contrastText: '#27231C',
            hover: '#A88A40'
          },
      action: { hover: colors.hover, selected: colors.soft }
    },
    typography: { body2: { fontSize: 14 } },
    components: {
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiAlert: {
        styleOverrides: {
          standardInfo: {
            background: 'transparent',
            color: colors.muted,
            border: 0,
            '& .MuiAlert-icon': { color: colors.muted }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          colorSuccess: { background: colors.successBg, color: colors.success, border: 0 },
          colorError: { background: colors.errorBg, color: colors.error, border: 0 }
        }
      }
    }
  });
}
