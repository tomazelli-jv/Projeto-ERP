import { forwardRef } from 'react';
import { Button } from '@mui/material';
import PropTypes from 'prop-types';
import { actionButtonSize } from './action-button-styles.js';

// Adaptado de Uiverse.io por gharsh11032000. Tokens mantêm contraste nos dois temas;
// active preserva a aparência normal quando a mesma ação passa a ser "Voltar".
export const CancelButton = forwardRef(function CancelButton(
  { children = 'Cancelar', active = true, sx, ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      type="button"
      {...props}
      sx={[
        actionButtonSize,
        active &&
          ((theme) => ({
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            backgroundColor: theme.palette.background.paper,
            border: 'none',
            color: theme.palette.text.primary,
            fontWeight: 600,
            borderRadius: '50px',
            cursor: 'not-allowed',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
            '& .cancel-label': { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center' },
            '&::before': {
              position: 'absolute',
              content: '""',
              inset: 0,
              width: '100%',
              height: '100%',
              translate: '0 105%',
              backgroundColor: theme.palette.error.main,
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)'
            },
            '& svg': {
              position: 'relative',
              zIndex: 2,
              width: 18,
              height: 18,
              fill: theme.palette.error.main,
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)'
            },
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.error.contrastText,
              border: 'none',
              '&::before': { translate: '0 0' },
              '& svg': { fill: theme.palette.error.contrastText }
            },
            '&:hover': { animation: 'cancel-shake 0.2s linear 1' },
            '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.error.main}`, outlineOffset: 3 },
            '&.Mui-disabled': {
              color: theme.palette.action.disabled,
              backgroundColor: theme.palette.action.disabledBackground
            },
            '@keyframes cancel-shake': {
              '0%': { rotate: '0deg' },
              '33%': { rotate: '10deg' },
              '66%': { rotate: '-10deg' },
              '100%': { rotate: '10deg' }
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { animation: 'none' },
              '&::before, & svg': { transition: 'none' }
            }
          })),
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      <span className="cancel-label">{children}</span>
    </Button>
  );
});

CancelButton.propTypes = {
  children: PropTypes.node,
  active: PropTypes.bool,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.func, PropTypes.array])
};
