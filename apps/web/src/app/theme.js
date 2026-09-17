import { alpha, createTheme } from '@mui/material/styles';
import { darkPalette, lightPalette } from './theme-tokens.js';

// Uma fábrica e os mesmos overrides atendem ambos os modos. Não há toggle ou persistência nova.
export const createErpTheme = (mode = 'light') =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      fontSize: 14,
      h1: {
        fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.025em'
      },
      h2: { fontSize: '1.75rem', fontWeight: 650 },
      h3: { fontSize: '1rem', fontWeight: 650 },
      body1: { fontSize: '0.875rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
      button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (t) => ({
          body: { minWidth: 320, colorScheme: t.palette.mode },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.palette.divider} ${t.palette.background.default}`
          },
          '*:focus-visible': { outline: `2px solid ${t.palette.primary.dark}`, outlineOffset: 3 }
        })
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            border: `1px solid ${t.palette.divider}`,
            borderRadius: 10,
            boxShadow: 'none'
          })
        }
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 40, borderRadius: 8, paddingInline: 16 },
          textPrimary: ({ theme: t }) => ({ color: t.palette.primary.dark }),
          containedPrimary: ({ theme: t }) => ({ '&:hover': { backgroundColor: t.palette.primary.hover } }),
          outlinedPrimary: ({ theme: t }) => ({
            borderColor: t.palette.divider,
            color: t.palette.text.primary,
            backgroundColor: t.palette.surface.secondary,
            '&:hover': { borderColor: t.palette.primary.border, backgroundColor: t.palette.action.hover }
          })
        }
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            backgroundColor: t.palette.surface.secondary,
            borderRadius: 8,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.palette.divider },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.palette.text.disabled },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: t.palette.primary.dark,
              borderWidth: 1
            }
          }),
          input: { paddingTop: 11, paddingBottom: 11 }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme: t }) => ({ borderRadius: 12, border: `1px solid ${t.palette.divider}` })
        }
      },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: 18, fontWeight: 650 } } },
      MuiInputLabel: {
        styleOverrides: { root: ({ theme: t }) => ({ '&.Mui-focused': { color: t.palette.primary.dark } }) }
      },
      MuiSvgIcon: { styleOverrides: { colorPrimary: ({ theme: t }) => ({ color: t.palette.primary.dark }) } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', gap: 8 } } },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            marginTop: 6,
            minWidth: 220,
            border: `1px solid ${t.palette.divider}`,
            backgroundColor: t.palette.surface.secondary
          })
        }
      },
      MuiMenuItem: { styleOverrides: { root: { minHeight: 40, fontSize: 14 } } },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: ({ theme: t, ownerState }) => {
            const c =
              ownerState.color === 'primary' ? t.palette.primary.dark : t.palette[ownerState.color]?.main;
            return {
              fontSize: 12,
              fontWeight: 600,
              height: 26,
              ...(c
                ? { color: c, backgroundColor: alpha(c, 0.1), border: `1px solid ${alpha(c, 0.25)}` }
                : { backgroundColor: t.palette.surface.secondary })
            };
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, fontSize: 13 },
          standard: ({ theme: t, ownerState }) => ({
            backgroundColor: alpha(t.palette[ownerState.severity || 'info'].main, 0.08),
            color: t.palette.text.primary,
            border: `1px solid ${alpha(t.palette[ownerState.severity || 'info'].main, 0.25)}`
          })
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme: t }) => ({ padding: '12px 16px', borderColor: t.palette.divider }),
          head: ({ theme: t }) => ({
            color: t.palette.text.secondary,
            backgroundColor: t.palette.surface.secondary,
            fontWeight: 600
          })
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme: t }) => ({ '&:hover': { backgroundColor: t.palette.action.hover } })
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme: t }) => ({
            backgroundColor: t.palette.surface.hover,
            color: t.palette.text.primary,
            border: `1px solid ${t.palette.divider}`,
            fontSize: 12
          })
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            backgroundColor: t.palette.background.paper,
            borderColor: t.palette.divider,
            borderRadius: 0
          })
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            backgroundColor: t.palette.background.paper,
            backgroundImage: 'none',
            color: t.palette.text.primary
          })
        }
      },
      MuiAvatar: { styleOverrides: { root: ({ theme: t }) => ({ color: t.palette.primary.contrastText }) } },
      MuiSkeleton: {
        styleOverrides: { root: ({ theme: t }) => ({ backgroundColor: t.palette.action.hover }) }
      }
    }
  });

// Light é o modo ativo desta entrega; dark reutiliza a mesma estrutura, sem novo seletor de tema.
export const theme = createErpTheme('light');
