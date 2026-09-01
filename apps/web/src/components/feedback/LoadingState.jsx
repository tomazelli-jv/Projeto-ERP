import { Skeleton, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export function LoadingState({ message = 'Carregando informações...', rows = 2 }) {
  return (
    <Stack aria-live="polite" role="status" spacing={1.5}>
      <Typography color="text.secondary" variant="body2">
        {message}
      </Typography>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton height={112} key={index} variant="rounded" />
      ))}
    </Stack>
  );
}

LoadingState.propTypes = { message: PropTypes.string, rows: PropTypes.number };
