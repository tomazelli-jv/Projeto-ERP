import { alpha } from '@mui/material/styles';

// Movimento discreto e compartilhado; usuários com movimento reduzido recebem estados estáticos.
const motion = '180ms ease-out';
const reduced = {
  '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none', transform: 'none' }
};
const reveal = {
  animation: `receivableReveal ${motion} both`,
  '@keyframes receivableReveal': {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  ...reduced
};
export const formGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
  gap: 2.5
};
export const inputStyles = (theme) => ({
  '& .MuiOutlinedInput-root': {
    minHeight: 44,
    transition: `border-color ${motion}, box-shadow ${motion}, background-color ${motion}`,
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.success.main },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(theme.palette.success.main, 0.12)}`,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.success.main, borderWidth: 1 }
    },
    ...reduced
  },
  '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.success.main }
});
export const pageStyles = (theme) => ({
  ...inputStyles(theme),
  '& h1': { ...reveal, fontSize: { xs: 25, md: 30 } },
  '& .MuiPaginationItem-root.Mui-selected': {
    bgcolor: theme.palette.success.dark,
    color: theme.palette.getContrastText(theme.palette.success.dark)
  },
  '& .MuiAlert-standardInfo': {
    bgcolor: alpha(theme.palette.info.main, 0.06),
    borderColor: alpha(theme.palette.info.main, 0.16),
    color: 'text.secondary',
    '& .MuiAlert-icon': { fontSize: 18 }
  }
});
export const newTitleStyles = (theme) => ({
  minHeight: 44,
  px: 3,
  borderRadius: 1.5,
  bgcolor: theme.palette.success.dark,
  color: theme.palette.getContrastText(theme.palette.success.dark),
  boxShadow: theme.shadows[1],
  transition: `background-color ${motion}, box-shadow ${motion}`,
  '&:hover': {
    bgcolor: theme.palette.success.main,
    color: theme.palette.getContrastText(theme.palette.success.main),
    boxShadow: theme.shadows[2]
  },
  ...reduced
});
export const summaryCardStyles = (color, index) => (theme) => ({
  ...reveal,
  animationDelay: `${index * 35}ms`,
  height: '100%',
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid',
  borderColor: alpha(theme.palette[color].main, 0.28),
  boxShadow: theme.shadows[1],
  borderRadius: 1.5,
  transition: `transform ${motion}, box-shadow ${motion}, border-color ${motion}`,
  '& .summary-icon': {
    color: theme.palette[color].main,
    bgcolor: alpha(theme.palette[color].main, 0.12),
    transition: `transform ${motion}`
  },
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[2],
      borderColor: alpha(theme.palette[color].main, 0.5),
      '& .summary-icon': { transform: 'translateY(-1px)' }
    }
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transition: 'none',
    '&:hover, &:hover .summary-icon': { transform: 'none' },
    '& .summary-icon': { transition: 'none' }
  }
});
export const tableStyles = (theme) => ({
  ...reveal,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'background.paper',
  '& th': {
    bgcolor: 'surface.secondary',
    color: 'text.secondary',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: 11,
    py: 1.75,
    whiteSpace: 'nowrap'
  },
  '& td': { py: 1.25, fontSize: 13 },
  '& tbody tr': {
    transition: `background-color ${motion}`,
    '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.06) },
    ...reduced
  },
  '& td:nth-of-type(6), & td:nth-of-type(7)': {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    whiteSpace: 'nowrap'
  }
});
export const actionStyles = (action) => (theme) => {
  const color =
    theme.palette[{ view: 'info', edit: 'warning', receive: 'success', cancel: 'error' }[action]].main;
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    mr: 0.5,
    color: 'text.secondary',
    transition: `background-color ${motion}, color ${motion}, transform ${motion}`,
    '&:hover': { color, bgcolor: alpha(color, 0.12), transform: 'scale(1.04)' },
    '&.Mui-focusVisible': { outline: `2px solid ${color}`, outlineOffset: 2 },
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
  };
};
export const secondarySurface = {
  p: { xs: 2, sm: 2.5 },
  bgcolor: 'surface.secondary',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5
};
// Portal de Dialog recebe os mesmos estilos explicitamente, sem alterar o ThemeProvider global.
export const dialogStyles = (theme) => ({
  ...inputStyles(theme),
  '& .MuiDialog-paper': {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    animation: `receivableDialog ${motion}`,
    '@keyframes receivableDialog': {
      from: { opacity: 0, transform: 'scale(0.98)' },
      to: { opacity: 1, transform: 'scale(1)' }
    },
    ...reduced
  },
  '& .MuiDialogTitle-root': { px: 3, py: 2.5, fontWeight: 700, fontSize: 20 },
  '& .MuiDialogContent-root': { p: { xs: 2, sm: 3 } },
  '& .MuiDialogActions-root': {
    px: 3,
    py: 2,
    gap: 1,
    flexShrink: 0,
    borderTop: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper'
  },
  '& .MuiButton-containedPrimary': newTitleStyles(theme)
});
