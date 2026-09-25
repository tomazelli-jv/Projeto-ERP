import { Box, Stack } from '@mui/material';
import PropTypes from 'prop-types';

// Reserva espaço no fluxo e mantém ações na viewport, inclusive com teclado e safe area móvel.
export function StickyFormActions({ children }) {
  return (
    <>
      <Box sx={{ height: 100 }} aria-hidden="true" />
      <Stack
        direction="row"
        justifyContent="space-between"
        spacing={2}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          px: { xs: 2, md: 4 },
          pt: 2,
          pb: 'max(16px, env(safe-area-inset-bottom))'
        }}
      >
        {children}
      </Stack>
    </>
  );
}
StickyFormActions.propTypes = { children: PropTypes.node.isRequired };
