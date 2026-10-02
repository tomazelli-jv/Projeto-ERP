import { useState } from 'react';
import PropTypes from 'prop-types';
import { IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLookupList } from '../catalog-lookups/lookup-queries.js';
import { groupModule } from './group-module.js';
import { GroupsDialog } from './GroupsDialog.jsx';

// O mesmo cadastro pode ser aberto aqui sem perder o formulário do produto.
// category é a descrição histórica; groupId é o vínculo estável para novos cadastros.
export function GroupField({ value, groupId, initialId, onChange }) {
  const [open, setOpen] = useState(false);
  const query = useLookupList(groupModule);
  const rows = query.data?.items ?? [];
  const options = rows.filter((row) => row.active || row.id === initialId);
  const selected = groupId || (value ? '__legacy' : '');
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          select
          fullWidth
          label="Grupo"
          value={selected}
          disabled={query.isPending || query.isError}
          helperText={
            query.isError
              ? 'Não foi possível carregar grupos.'
              : 'Novos vínculos utilizam somente grupos ativos.'
          }
          onChange={(e) => {
            const row = rows.find((item) => item.id === e.target.value);
            onChange({ category: row?.name ?? '', groupId: row?.id ?? '' });
          }}
        >
          <MenuItem value="">Sem grupo</MenuItem>
          {!groupId && value && (
            <MenuItem value="__legacy" disabled>
              {value} (cadastro anterior)
            </MenuItem>
          )}
          {groupId && !options.some((row) => row.id === groupId) && (
            <MenuItem value={groupId} disabled>
              {value} (indisponível)
            </MenuItem>
          )}
          {options.map((row) => (
            <MenuItem key={row.id} value={row.id} disabled={!row.active}>
              {row.name}
              {!row.active ? ' (inativo)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title="Cadastrar grupo">
          <IconButton aria-label="Cadastrar grupo" onClick={() => setOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <GroupsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
GroupField.propTypes = {
  value: PropTypes.string.isRequired,
  groupId: PropTypes.string,
  initialId: PropTypes.string,
  onChange: PropTypes.func.isRequired
};
