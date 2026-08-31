import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { AppBreadcrumbs } from './AppBreadcrumbs.jsx';

export function PageHeader({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      gap={2}
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <AppBreadcrumbs />
        <Typography component="h1" sx={{ overflowWrap: 'anywhere' }} variant="h1">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
          {description}
        </Typography>
      </Box>
      {action && <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Stack>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  action: PropTypes.node
};
