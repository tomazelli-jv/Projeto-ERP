import { alpha, createTheme } from '@mui/material/styles';

// Mantém o layout compacto e deriva as cores do tema ativo, inclusive System.
export function createLookupTheme(base) {
  const dark = base.palette.mode === 'dark';
  const colors = dark
    ? {
        surface: base.palette.surface.secondary,
        border: base.palette.divider,
        muted: base.palette.text.secondary,
        accentText: base.palette.primary.dark,
        accent: base.palette.primary.main,
        halo: base.palette.primary.soft,
        successBg: alpha(base.palette.success.main, 0.14),
        successText: base.palette.success.main,
        errorBg: alpha(base.palette.error.main, 0.14),
        errorText: base.palette.error.main
      }
    : {
        surface: '#F3F2ED',
        border: '#E3DED2',
        muted: '#7D776A',
        accentText: '#7A6226',
        accent: '#B5964A',
        halo: '#E9DFC6',
        successBg: '#E6EFE6',
        successText: '#3E6B47',
        errorBg: '#F4E3E1',
        errorText: '#9A4A44'
      };
  return createTheme(base, {
    palette: dark
      ? base.palette
      : {
          mode: 'light',
          background: { default: '#F3F2ED', paper: '#FAF8F4' },
          divider: '#E3DED2',
          text: { primary: '#27231C', secondary: '#7D776A' },
          surface: { secondary: '#F3F2ED', hover: '#F0EDE5' },
          primary: {
            main: '#B5964A',
            dark: '#7A6226',
            soft: '#E9DFC6',
            light: '#E9DFC6',
            border: '#E3DED2',
            contrastText: '#27231C'
          }
        },
    components: {
      MuiBackdrop: {
        styleOverrides: { root: { backgroundColor: dark ? 'rgba(0,0,0,.6)' : 'rgba(39,35,28,.45)' } }
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16, boxShadow: '0 12px 40px rgba(39,35,28,.16)', backgroundImage: 'none' }
        }
      },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: 18, fontWeight: 650 } } },
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: 'relative',
            transform: 'none',
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 6,
            color: colors.muted,
            '&.Mui-focused': { color: colors.accentText }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: colors.surface,
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${colors.halo}` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.accent, borderWidth: 1 }
          },
          notchedOutline: { top: 0, borderColor: colors.border, '& legend': { display: 'none' } }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: 'transparent',
            color: colors.muted,
            fontSize: 13,
            fontWeight: 500,
            textTransform: 'none'
          },
          root: { borderColor: colors.border }
        }
      },
      MuiChip: {
        styleOverrides: {
          colorSuccess: { backgroundColor: colors.successBg, color: colors.successText, border: 0 },
          colorError: { backgroundColor: colors.errorBg, color: colors.errorText, border: 0 }
        }
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { color: colors.muted },
          toolbar: { minHeight: 44, paddingRight: 0 },
          displayedRows: { fontSize: 12 }
        }
      }
    }
  });
}
