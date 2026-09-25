import { TextField } from '@mui/material';
import PropTypes from 'prop-types';
import { formatCep, formatPhone } from './business-formatters.js';

// Máscaras compartilhadas limitam também colagem e exibem valores não mascarados da API.
export function ContactField({ kind, value, onChange, required = false, helperText, label, error = false }) {
  const phone = kind === 'phone';
  const format = phone ? formatPhone : formatCep;
  return (
    <TextField
      error={error}
      helperText={helperText}
      fullWidth
      required={required}
      label={label ?? (phone ? 'Telefone' : 'CEP')}
      type={phone ? 'tel' : 'text'}
      value={format(value)}
      placeholder={phone ? '(00) 00000-0000' : '00000-000'}
      onChange={(event) => onChange(format(event.target.value))}
      slotProps={{
        htmlInput: {
          maxLength: phone ? 15 : 9,
          inputMode: phone ? 'tel' : 'numeric',
          autoComplete: phone ? 'tel-national' : 'postal-code'
        }
      }}
    />
  );
}
ContactField.propTypes = {
  label: PropTypes.string,
  helperText: PropTypes.string,
  kind: PropTypes.oneOf(['phone', 'cep']).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  required: PropTypes.bool
};
