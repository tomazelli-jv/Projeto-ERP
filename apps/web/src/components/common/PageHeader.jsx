import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { AppBreadcrumbs } from './AppBreadcrumbs.jsx';

// Cada tela possui um único título principal; a hierarquia anterior fica no breadcrumb discreto.
export function PageHeader({ title, description, action, titleBadge, breadcrumbs, titleId }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      gap={2}
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <AppBreadcrumbs items={breadcrumbs} />
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography id={titleId} component="h1" sx={{ overflowWrap: 'anywhere' }} variant="h1">
            {title}
          </Typography>
          {titleBadge}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
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
  titleBadge: PropTypes.node,
  breadcrumbs: PropTypes.arrayOf(PropTypes.string),
  titleId: PropTypes.string
};
