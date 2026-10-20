import AddIcon from '@mui/icons-material/Add';
import { Box, Button } from '@mui/material';
import PropTypes from 'prop-types';
import { forwardRef } from 'react';
import { actionButtonSize } from './action-button-styles.js';

// Efeito compartilhado de criação na stack MUI: mantém Link, submit, disabled e foco nativos.
export const CreateButton = forwardRef(function CreateButton({ children, sx, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="outlined"
      {...props}
      sx={[
        {
          ...actionButtonSize,
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          borderRadius: 99,
          px: 3,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderColor: 'primary.border',
          '&::before': {
            content: '""',
            position: 'absolute',
            zIndex: -1,
            width: 6,
            height: 6,
            borderRadius: '50%',
            left: 10,
            top: 'calc(50% - 3px)',
            bgcolor: 'primary.main',
            transform: 'scale(1)',
            transition: 'transform 500ms ease'
          },
          '& .create-label': { transition: 'transform 500ms ease', transform: 'translateX(3px)' },
          '& .create-icon': {
            position: 'absolute',
            right: 8,
            fontSize: 18,
            opacity: 0,
            transform: 'translateX(-8px)',
            transition: 'opacity 500ms ease, transform 500ms ease'
          },
          '&:not(.Mui-disabled):hover, &.Mui-focusVisible': {
            color: 'primary.contrastText',
            bgcolor: 'background.paper',
            borderColor: 'primary.main',
            '&::before': { transform: 'scale(100)' },
            '& .create-label': { transform: 'translateX(-5px)' },
            '& .create-icon': { opacity: 1, transform: 'translateX(0)' }
          },
          '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.dark', outlineOffset: 3 },
          '&.Mui-disabled::before': { bgcolor: 'action.disabled' },
          '@media (prefers-reduced-motion: reduce)': {
            '&::before, & .create-label, & .create-icon': { transition: 'none' }
          }
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      <Box component="span" className="create-label">
        {children}
      </Box>
      <AddIcon className="create-icon" fontSize="small" aria-hidden="true" />
    </Button>
  );
});
CreateButton.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func])
};
