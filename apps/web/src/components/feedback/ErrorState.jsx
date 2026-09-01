import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export function ErrorState({
  title = 'Não foi possível carregar as informações.',
  description,
  requestId,
  onRetry
}) {
  return (
    <Stack
      alignItems="flex-start"
      role="alert"
      spacing={1.25}
      sx={{ borderLeft: 3, borderColor: 'error.main', pl: 2, py: 0.5 }}
    >
      <Stack alignItems="center" direction="row" spacing={1}>
        <ErrorOutlineIcon color="error" fontSize="small" />
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      {description && (
        <Typography color="text.secondary" variant="body2">
          {description}
        </Typography>
      )}
      {requestId && (
        <Typography color="text.secondary" variant="caption">
          Referência: {requestId}
        </Typography>
      )}
      {onRetry && (
        <Button onClick={onRetry} size="small" variant="outlined">
          Tentar novamente
        </Button>
      )}
    </Stack>
  );
}

ErrorState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  requestId: PropTypes.string,
  onRetry: PropTypes.func
};
