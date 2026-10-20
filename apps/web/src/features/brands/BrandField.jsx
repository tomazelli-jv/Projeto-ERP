import PropTypes from 'prop-types';
import { MenuItem, TextField, IconButton, Stack, Tooltip } from '@mui/material';
import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { BrandsDialog } from './BrandsDialog.jsx';
import { useBrands } from './brands-queries.js';

// IDs estabilizam novos vínculos; nomes legados/inativos permanecem visíveis sem virar opção nova.
export function BrandField({ value, brandId, initialName, initialId, onChange }) {
  const [open, setOpen] = useState(false);
  const query = useBrands();
  const rows = query.data?.items ?? [];
  const selected = rows.find((row) => row.id === brandId);
  const legacy = !brandId && value;
  const key = brandId || (legacy ? '__legacy' : '');
  const options = rows.filter((row) => row.active || row.id === initialId);
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          select
          fullWidth
          label="Marca"
          value={key}
          disabled={query.isPending || query.isError}
          helperText={
            query.isError
              ? 'Não foi possível carregar marcas. Reabra o cadastro para tentar novamente.'
              : query.isPending
                ? 'Carregando marcas...'
                : 'Novos vínculos utilizam somente marcas ativas.'
          }
          onChange={(event) => {
            const row = rows.find((entry) => entry.id === event.target.value);
            onChange(row ? { brand: row.name, brandId: row.id } : { brand: '', brandId: '' });
          }}
        >
          <MenuItem value="">Sem marca</MenuItem>
          {legacy && (
            <MenuItem value="__legacy" disabled>
              {initialName || value} (cadastro anterior)
            </MenuItem>
          )}
          {brandId && !options.some((row) => row.id === brandId) && (
            <MenuItem value={brandId} disabled>
              {selected?.name || value} (indisponível)
            </MenuItem>
          )}
          {options.map((row) => (
            <MenuItem key={row.id} value={row.id} disabled={!row.active}>
              {row.name}
              {!row.active ? ' (inativa)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title="Cadastrar marca">
          <IconButton aria-label="Cadastrar marca" onClick={() => setOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <BrandsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
BrandField.propTypes = {
  value: PropTypes.string.isRequired,
  brandId: PropTypes.string,
  initialName: PropTypes.string,
  initialId: PropTypes.string,
  onChange: PropTypes.func.isRequired
};
