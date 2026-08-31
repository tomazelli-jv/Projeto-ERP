import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Typography } from '@mui/material';
import { useLocation } from 'react-router';
import { getRouteMetadata } from '../../app/navigation.js';

export function AppBreadcrumbs() {
  const route = getRouteMetadata(useLocation().pathname);
  if (!route) return null;
  return (
    <Breadcrumbs
      aria-label="Navegação estrutural"
      separator={<NavigateNextIcon fontSize="inherit" />}
      sx={{ mb: 1 }}
    >
      {route.group && (
        <Typography color="text.secondary" variant="body2">
          {route.group}
        </Typography>
      )}
      <Typography color="text.primary" variant="body2">
        {route.label}
      </Typography>
    </Breadcrumbs>
  );
}
