import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { EntityInfo } from '../parties/EntityShared.jsx';
import { formatDate } from '../../components/business/business-formatters.js';

// Exibe somente preferências persistidas, sem inferir saldos, compras ou contas a pagar.
export function SupplierFinancialSummary({ financial: f }) {
  const percent =
    f.freightPercent == null
      ? '—'
      : `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(f.freightPercent)} %`;
  const days = (value) => (value == null ? '—' : `${value} dias`);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 3 }}>
      <EntityInfo
        items={[
          ['Frete', percent],
          ['Última visita', formatDate(f.lastVisit)],
          ['Próxima visita', formatDate(f.nextVisit)]
        ]}
      />
      <EntityInfo
        items={[
          ['Dia de visita', f.visitWeekDay],
          ['Frequência de visita', days(f.visitFrequencyDays)],
          ['Prazo de pagamento', days(f.paymentTermDays)]
        ]}
      />
    </Box>
  );
}
SupplierFinancialSummary.propTypes = { financial: PropTypes.object.isRequired };
