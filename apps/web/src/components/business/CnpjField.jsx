import { TextField } from '@mui/material';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { formatCnpj, validateCnpj } from './business-formatters.js';

// Campo comum aceita teclado alfanumérico e também mascara valores vindos da API na edição.
// Limite da entrada: 14 caracteres alfanuméricos; os quatro separadores são apenas visuais.
export function CnpjField({ value, onChange, required = false, error = false, helperText }) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && Boolean(value) && !validateCnpj(value);
  return (
    <TextField
      fullWidth
      required={required}
      label="CNPJ"
      type="text"
      value={formatCnpj(value)}
      onChange={(event) => {
        const document = event.target.value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 14);
        onChange(formatCnpj(document));
      }}
      onBlur={() => setTouched(true)}
      error={error || invalid}
      placeholder="12.ABC.345/01DE-35"
      helperText={
        helperText ||
        (invalid
          ? 'CNPJ inválido. Confira os 14 caracteres e os dígitos verificadores.'
          : 'Aceita números e letras; os dois últimos caracteres devem ser números.')
      }
      slotProps={{
        htmlInput: { maxLength: 18, inputMode: 'text', autoCapitalize: 'characters', spellCheck: false }
      }}
    />
  );
}
CnpjField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool
};
