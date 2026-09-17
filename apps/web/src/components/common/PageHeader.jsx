import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { AppBreadcrumbs } from './AppBreadcrumbs.jsx';

// Badge opcional acompanha o título sem alterar breadcrumb ou ações das demais páginas.
export function PageHeader({ title, description, action, titleBadge }) {
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
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography component="h1" sx={{ overflowWrap: 'anywhere' }} variant="h1">
            {title}
          </Typography>
          {titleBadge}
        </Stack>
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
  action: PropTypes.node,
  titleBadge: PropTypes.node
};
