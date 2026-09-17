import { Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { PageHeader } from '../components/common/PageHeader.jsx';

// Integration state is informational, not a promise of a working search or API action.
export function ModulePage({ title, description, icon: Icon }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}
      >
        <Box sx={{ color: 'text.secondary', pt: 0.5 }}>
          <Icon fontSize="small" />
        </Box>
        <Stack spacing={1.5} alignItems="flex-start">
          <Chip label="Integração em andamento" variant="outlined" />
          <Typography color="text.secondary">
            Este módulo estará disponível após a integração dos dados operacionais.
          </Typography>
        </Stack>
      </Stack>
    </>
  );
}
ModulePage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired
};
