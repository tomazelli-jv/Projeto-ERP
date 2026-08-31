import { Chip } from '@mui/material';
import PropTypes from 'prop-types';

function statusColor(status) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (['blocked', 'revoked', 'expired'].includes(status)) return 'error';
  return 'default';
}

export function StatusChip({ status, labels = {}, label, ...props }) {
  return (
    <Chip
      color={statusColor(status)}
      label={label ?? labels[status] ?? status ?? 'Não informado'}
      size="small"
      {...props}
    />
  );
}

StatusChip.propTypes = { status: PropTypes.string, labels: PropTypes.object, label: PropTypes.string };
