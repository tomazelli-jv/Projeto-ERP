import { useState } from 'react';
import PropTypes from 'prop-types';
import { InputAdornment, TextField } from '@mui/material';
import { parseMoney, moneyInput, validMoney } from './money.js';
// Rascunho preserva vírgula e entrada inválida para correção; nunca arredonda silenciosamente dinheiro.
export function MoneyField({ label, value, onChange, required = false, error = false, helperText }) {
  const [text, setText] = useState(() => moneyInput(value));
  const invalid = Boolean(text) && !validMoney(parseMoney(text));
  return (
    <TextField
      fullWidth
      label={label}
      required={required}
      value={text}
      error={error || invalid}
      helperText={
        helperText || (invalid ? 'Informe um valor não negativo, com até duas casas decimais.' : undefined)
      }
      placeholder="0,00"
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseMoney(event.target.value));
      }}
      onBlur={() => {
        const cents = parseMoney(text);
        if (validMoney(cents)) setText(moneyInput(cents));
      }}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
        htmlInput: { inputMode: 'decimal', maxLength: 20 }
      }}
    />
  );
}
MoneyField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string
};
