import { useEntityModule } from './entity-module.js';
import { Alert, Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { customerName, customerDocument, initials, typeLabel } from '../customers/customer-model.js';
import { formatPhone } from '../../components/business/business-formatters.js';

// Indicação persistente diferencia demonstração local de dados e autorização reais.
export function EntityDemoNotice() {
  const module = useEntityModule();
  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
    >{`Demonstração local — ${module.Plural} ainda não está integrado ao backend. Use apenas dados fictícios; os
      cadastros ficam neste navegador.`}</Alert>
  );
}
export function EntityStatus({ status }) {
  return (
    <Chip
      size="small"
      label={status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
      color={status === 'ACTIVE' ? 'success' : 'error'}
    />
  );
}
EntityStatus.propTypes = { status: PropTypes.string.isRequired };
export function EntityInfo({ items }) {
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
EntityInfo.propTypes = { items: PropTypes.array.isRequired };
export function EntitySummary({ customer }) {
  const module = useEntityModule();
  const name = customerName(customer);
  return (
    <SectionCard title={`Resumo do ${module.singular}`}>
      <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'surface.secondary', color: 'text.secondary' }}>
          {initials(name) || module.Singular[0]}
        </Avatar>
        <Typography variant="h3">{name || `Novo ${module.singular}`}</Typography>
        <EntityStatus status={customer.status} />
      </Stack>
      <EntityInfo
        items={[
          ['Tipo', typeLabel(customer.type)],
          ['Nome / Razão social', customer.type === 'PERSON' ? customer.name : customer.legalName],
          ['Documento', customerDocument(customer)],
          ...(module.commercial ? [['Contato', customer.contactName || customer.commercialContact]] : []),
          ['E-mail', customer.email],
          ['Telefone', formatPhone(customer.phone || customer.mobile)],
          ['Cidade / UF', [customer.address.city, customer.address.state].filter(Boolean).join(' / ')]
        ]}
      />
    </SectionCard>
  );
}
EntitySummary.propTypes = { customer: PropTypes.object.isRequired };
