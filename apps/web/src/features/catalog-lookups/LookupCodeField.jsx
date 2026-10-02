import { useState } from 'react';
import PropTypes from 'prop-types';
import { IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLookupList } from './lookup-queries.js';

import { LookupDialog } from './LookupDialog.jsx';

// Novas escolhas só oferecem ativas. Referências anteriores ficam visíveis, sem recriar ou reativar registros.
export function LookupCodeField({
  module,
  codeKey,
  label,
  value,
  recordId,
  initialValue,
  initialId,
  required,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const query = useLookupList(module);
  const rows = query.data?.items ?? [];
  const options = rows.filter(
    (row) => row.active || (initialId ? row.id === initialId : initialValue && row[codeKey] === initialValue)
  );
  const found = rows.find((row) => (recordId ? row.id === recordId : row[codeKey] === value));
  const oldSelection = Boolean(
    initialValue && (initialId ? recordId === initialId : !recordId && initialValue === value)
  );
  const selection =
    found && options.some((row) => row.id === found.id) ? found.id : oldSelection ? '__legacy' : '';
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          select
          fullWidth
          required={required}
          label={label}
          value={selection}
          disabled={query.isPending || query.isError}
          helperText={
            query.isError
              ? 'Não foi possível carregar as opções.'
              : 'Novos vínculos utilizam somente registros ativos.'
          }
          onChange={(e) => {
            const row = rows.find((item) => item.id === e.target.value);
            onChange({ code: row?.[codeKey] ?? '', id: row?.id ?? '' });
          }}
        >
          <MenuItem value="">Selecione uma opção</MenuItem>
          {selection === '__legacy' && (
            <MenuItem value="__legacy" disabled>
              {value} (cadastro anterior)
            </MenuItem>
          )}
          {options.map((row) => (
            <MenuItem key={row.id} value={row.id} disabled={!row.active}>
              {row[codeKey]} — {row.description}
              {!row.active ? ` (${module.inactiveLabel.toLowerCase()})` : ''}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title={module.createLabel}>
          <IconButton aria-label={module.createLabel} onClick={() => setOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <LookupDialog module={module} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
LookupCodeField.propTypes = {
  module: PropTypes.object.isRequired,
  codeKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  recordId: PropTypes.string,
  initialValue: PropTypes.string,
  initialId: PropTypes.string,
  required: PropTypes.bool,
  onChange: PropTypes.func.isRequired
};
