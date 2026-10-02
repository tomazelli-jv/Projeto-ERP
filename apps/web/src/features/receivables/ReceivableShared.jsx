import { alpha } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';
import { customerDocument, customerName } from '../customers/customer-model.js';
import { formatReceivableMoney as formatMoney } from './receivables-model.js';
import { formatReceivableDate as formatDate } from './receivables-model.js';
import { searchText, statusLabels } from './receivables-model.js';

// Os mesmos tokens semânticos mantêm contraste e significado em Light/Dark.
// MUI fornece uma key de React que deve ficar fora do spread de atributos DOM.
function optionProps(props) {
  const rest = { ...props };
  delete rest.key;
  return rest;
}
const colors = { OPEN: 'info', PARTIAL: 'warning', OVERDUE: 'error', PAID: 'success', CANCELED: 'default' };
export function ReceivableStatus({ status }) {
  return (
    <Chip
      size="small"
      label={statusLabels[status]}
      sx={(theme) => {
        const color =
          colors[status] === 'default' ? theme.palette.text.secondary : theme.palette[colors[status]].main;
        return {
          bgcolor: alpha(color, 0.1),
          color,
          border: '1px solid',
          borderColor: alpha(color, 0.2),
          borderRadius: 5,
          fontWeight: 500,
          height: 28
        };
      }}
    />
  );
}
ReceivableStatus.propTypes = { status: PropTypes.string.isRequired };
export function CustomerPicker({
  customers,
  value,
  onChange,
  disabled = false,
  required = false,
  label = 'Cliente'
}) {
  return (
    <Autocomplete
      options={customers}
      value={customers.find((c) => c.id === value) ?? null}
      disabled={disabled}
      getOptionLabel={customerName}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(options, { inputValue }) =>
        options.filter((c) =>
          [customerName(c), c.document].some((text) => searchText(text).includes(searchText(inputValue)))
        )
      }
      onChange={(_, customer) => onChange(customer?.id ?? '')}
      noOptionsText="Nenhum cliente disponível"
      renderOption={(props, customer) => {
        const rest = optionProps(props);
        return (
          <li key={customer.id} {...rest}>
            <Box>
              <Typography variant="body2">{customerName(customer)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {customerDocument(customer)}
              </Typography>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={required ? 'Nome, CPF ou CNPJ' : 'Todos'}
        />
      )}
    />
  );
}
CustomerPicker.propTypes = {
  customers: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string
};
export function TitleOverview({ title }) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}
    >
      {Object.entries({
        Cliente: title.customer ? customerName(title.customer) : 'Cliente indisponível',
        Documento: title.document || '—',
        Parcela: `${title.installmentNumber}/${title.installmentCount}`,
        Vencimento: formatDate(title.dueDate),
        'Valor original': formatMoney(title.originalAmountCents),
        'Saldo atual': formatMoney(title.balanceCents)
      }).map(([label, value]) => (
        <Box key={label} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {value}
          </Typography>
        </Box>
      ))}
      <ReceivableStatus status={title.status} />
    </Box>
  );
}
TitleOverview.propTypes = { title: PropTypes.object.isRequired };
