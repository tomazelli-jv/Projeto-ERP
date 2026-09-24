import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router';
import { getRouteMetadata } from '../../app/navigation.js';

// Estados locais (como o perfil da loja) podem complementar a hierarquia da rota.
export function AppBreadcrumbs({ items }) {
  const route = getRouteMetadata(useLocation().pathname);
  const labels = items ?? [route?.group, route?.label].filter(Boolean);
  if (!labels.length) return null;
  return (
    <Breadcrumbs
      aria-label="Navegação estrutural"
      separator={<NavigateNextIcon fontSize="inherit" />}
      sx={{ mb: 1 }}
    >
      {labels.map((label, index) => (
        <Typography
          key={`${index}-${label}`}
          color={index === labels.length - 1 ? 'text.primary' : 'text.secondary'}
          variant="caption"
          aria-current={index === labels.length - 1 ? 'page' : undefined}
        >
          {label}
        </Typography>
      ))}
    </Breadcrumbs>
  );
}

AppBreadcrumbs.propTypes = { items: PropTypes.arrayOf(PropTypes.string) };
