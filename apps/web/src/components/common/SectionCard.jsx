import { Card, CardContent, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

// Ícone opcional identifica a seção sem duplicar o card entre formulários e temas.
export function SectionCard({ title, subtitle, children, sx, icon: Icon }) {
  return (
    <Card sx={sx}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
        {(title || subtitle) && (
          <Stack spacing={0.5} sx={{ mb: 2.5 }}>
            {title && (
              <Stack direction="row" alignItems="center" spacing={1}>
                {Icon && <Icon color="primary" fontSize="small" />}
                <Typography component="h2" variant="h3">
                  {title}
                </Typography>
              </Stack>
            )}
            {subtitle && (
              <Typography color="text.secondary" variant="body2">
                {subtitle}
              </Typography>
            )}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

SectionCard.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  icon: PropTypes.elementType
};
