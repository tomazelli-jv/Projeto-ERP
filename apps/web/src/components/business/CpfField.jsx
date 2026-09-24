import { TextField } from '@mui/material';
import PropTypes from 'prop-types';
import { formatCpf } from './business-formatters.js';

// Componente reutilizável: 11 dígitos lógicos, 14 posições visuais e zeros preservados.
export function CpfField({ value, onChange, required = false }) {
  return (
    <TextField
      fullWidth
      required={required}
      label="CPF"
      type="text"
      value={formatCpf(value)}
      placeholder="000.000.000-00"
      onChange={(event) => onChange(formatCpf(event.target.value))}
      slotProps={{ htmlInput: { maxLength: 14, inputMode: 'numeric' } }}
    />
  );
}
CpfField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool
};
