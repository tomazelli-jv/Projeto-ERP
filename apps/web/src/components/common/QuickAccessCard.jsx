import { Box, Button, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { Link } from 'react-router';

const motion = '280ms cubic-bezier(0.4, 0, 0.2, 1)';

// Uma única área clicável: a camada decorativa fica atrás do conteúdo e não captura eventos.
export function QuickAccessCard({ icon: Icon, title, description, to, disabled = false }) {
  return (
    <Button
      component={disabled ? 'button' : Link}
      to={disabled ? undefined : to}
      disabled={disabled}
      variant="outlined"
      color="inherit"
      sx={{
        minWidth: 0,
        flexDirection: 'column',
        gap: 0.75,
        py: 2,
        borderColor: 'divider',
        bgcolor: 'surface.secondary',
        borderRadius: 1.5,
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        transition: `border-color ${motion}`,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          bgcolor: 'primary.soft',
          transform: 'scaleX(0)',
          transformOrigin: 'right center',
          transition: `transform ${motion}`
        },
        '& .quick-icon, & .quick-title': { transition: `transform ${motion}` },
        '&:not(.Mui-disabled):hover, &.Mui-focusVisible': {
          bgcolor: 'surface.secondary',
          borderColor: 'primary.border',
          '&::before': { transform: 'scaleX(1)' },
          '& .quick-icon': { transform: 'translateX(-4px)' },
          '& .quick-title': { transform: 'translateX(-2px)' }
        },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.dark', outlineOffset: 2 },
        // Com movimento reduzido, o preenchimento é instantâneo e o conteúdo permanece no lugar.
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&::before, & .quick-icon, & .quick-title': { transition: 'none' },
          '&:hover .quick-icon, &.Mui-focusVisible .quick-icon, &:hover .quick-title, &.Mui-focusVisible .quick-title':
            { transform: 'none' }
        }
      }}
    >
      <Box
        component="span"
        className="quick-icon"
        sx={{ display: 'flex', color: disabled ? 'inherit' : 'primary.dark', mb: 0.5 }}
      >
        <Icon />
      </Box>
      <Typography component="span" className="quick-title" variant="body2" fontWeight={650}>
        {title}
      </Typography>
      <Typography
        component="span"
        variant="caption"
        color={disabled ? 'inherit' : 'text.secondary'}
        sx={{ textAlign: 'center' }}
      >
        {description}
      </Typography>
    </Button>
  );
}
QuickAccessCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  disabled: PropTypes.bool
};
