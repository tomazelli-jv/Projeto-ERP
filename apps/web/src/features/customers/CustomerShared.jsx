import { Alert, Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { customerName, customerDocument, initials, typeLabel } from './customer-model.js';
import { formatPhone } from '../../components/business/business-formatters.js';

// Indicação persistente diferencia demonstração local de dados e autorização reais.
export function CustomerDemoNotice() {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      Demonstração local — Clientes ainda não está integrado ao backend. Use apenas dados fictícios; os
      cadastros ficam neste navegador.
    </Alert>
  );
}
export function CustomerStatus({ status }) {
  return (
    <Chip
      size="small"
      label={status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
      color={status === 'ACTIVE' ? 'success' : 'error'}
    />
  );
}
CustomerStatus.propTypes = { status: PropTypes.string.isRequired };
export function CustomerInfo({ items }) {
  return (
    <Stack spacing={2}>
      {items.map(([label, value]) => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
            {value || '—'}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
CustomerInfo.propTypes = { items: PropTypes.array.isRequired };
export function CustomerSummary({ customer }) {
  const name = customerName(customer);
  return (
    <SectionCard title="Resumo do cliente">
      <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'surface.secondary', color: 'text.secondary' }}>
          {initials(name) || 'C'}
        </Avatar>
        <Typography variant="h3">{name || 'Novo cliente'}</Typography>
        <CustomerStatus status={customer.status} />
      </Stack>
      <CustomerInfo
        items={[
          ['Tipo', typeLabel(customer.type)],
          ['Nome / Razão social', customer.type === 'PERSON' ? customer.name : customer.legalName],
          ['Documento', customerDocument(customer)],
          ['E-mail', customer.email],
          ['Telefone', formatPhone(customer.phone || customer.mobile)],
          ['Cidade / UF', [customer.address.city, customer.address.state].filter(Boolean).join(' / ')]
        ]}
      />
    </SectionCard>
  );
}
CustomerSummary.propTypes = { customer: PropTypes.object.isRequired };
