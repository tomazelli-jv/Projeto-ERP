import { Box, TextField, MenuItem, InputAdornment } from '@mui/material';
import PropTypes from 'prop-types';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { ContactField } from '../../components/business/ContactField.jsx';
import { businessCardSx } from '../../components/business/business-styles.js';
import { supplierTypes, visitWeekDays } from './supplier-model.js';

const grid = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))' },
  gap: 2.5
};
// Apenas campos específicos; documentos, CEP, endereço, status e navegação vêm do editor comum.
export function SupplierGeneralFields({ form, change, errors }) {
  const field = (key, label) => (
    <TextField
      label={label}
      value={form[key]}
      onChange={(e) => change(key, e.target.value)}
      error={Boolean(errors[key])}
      helperText={errors[key]}
      slotProps={{ htmlInput: { maxLength: 200 } }}
    />
  );
  return (
    <SectionCard title="Dados comerciais" sx={businessCardSx}>
      <Box sx={grid}>
        <TextField
          select
          label="Tipo do fornecedor"
          value={form.supplierType}
          onChange={(e) => change('supplierType', e.target.value)}
          error={Boolean(errors.supplierType)}
          helperText={errors.supplierType}
        >
          <MenuItem value="">Não informado</MenuItem>
          {supplierTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
        {field('commercialContact', 'Pessoa de contato')}
        {field('commercialEmail', 'E-mail comercial')}
        <ContactField
          kind="phone"
          label="Telefone comercial"
          value={form.commercialPhone}
          onChange={(value) => change('commercialPhone', value)}
          error={Boolean(errors.commercialPhone)}
          helperText={errors.commercialPhone}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Observações comerciais"
          value={form.commercialNotes}
          onChange={(e) => change('commercialNotes', e.target.value)}
          slotProps={{ htmlInput: { maxLength: 4000 } }}
        />
      </Box>
    </SectionCard>
  );
}
SupplierGeneralFields.propTypes = {
  form: PropTypes.object.isRequired,
  change: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired
};

// Rascunhos numéricos mantêm vírgula e erros visíveis; o modelo converte somente na persistência.
export function SupplierFinancialFields({ financial, onChange, errors }) {
  const field = (key, label, unit, type = 'text') => (
    <TextField
      label={label}
      type={type}
      value={
        key === 'freightPercent' && typeof financial[key] === 'number'
          ? new Intl.NumberFormat('pt-BR', {
              useGrouping: false,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(financial[key])
          : (financial[key] ?? '')
      }
      onChange={(e) => onChange({ ...financial, [key]: e.target.value })}
      error={Boolean(errors[key])}
      helperText={errors[key]}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: {
          maxLength: 20,
          ...(type === 'text' ? { inputMode: key === 'freightPercent' ? 'decimal' : 'numeric' } : {})
        },
        input: unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined
      }}
    />
  );
  return (
    <SectionCard
      title="Financeiro"
      subtitle="Preferências comerciais. Não gera contas ou movimentações."
      sx={businessCardSx}
    >
      <Box sx={grid}>
        {field('freightPercent', 'Frete', '%')}
        {field('lastVisit', 'Última visita', null, 'date')}
        {field('nextVisit', 'Próxima visita', null, 'date')}
        <TextField
          select
          label="Dia de visita"
          value={financial.visitWeekDay}
          onChange={(e) => onChange({ ...financial, visitWeekDay: e.target.value })}
          error={Boolean(errors.visitWeekDay)}
          helperText={errors.visitWeekDay}
        >
          <MenuItem value="">Não informado</MenuItem>
          {visitWeekDays.map((day) => (
            <MenuItem key={day} value={day}>
              {day}
            </MenuItem>
          ))}
        </TextField>
        {field('visitFrequencyDays', 'Frequência de visita', 'dias')}
        {field('paymentTermDays', 'Prazo de pagamento', 'dias')}
      </Box>
    </SectionCard>
  );
}
SupplierFinancialFields.propTypes = {
  financial: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired
};
