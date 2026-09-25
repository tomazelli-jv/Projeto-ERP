import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Switch,
  TextField
} from '@mui/material';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { StickyFormActions } from '../../components/common/StickyFormActions.jsx';
import { CreateButton } from '../../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { CpfField } from '../../components/business/CpfField.jsx';
import { CnpjField } from '../../components/business/CnpjField.jsx';
import { ContactField } from '../../components/business/ContactField.jsx';
import { MoneyField } from '../../components/business/MoneyField.jsx';
import { businessFormSx, businessCardSx } from '../../components/business/business-styles.js';
import { useCepLookup } from '../../app/useCepLookup.js';
import { mergeCepAddress } from '../../api/cep.js';
import { useEntityMutation } from '../parties/entity-queries.js';
import { EntitySummary } from '../parties/EntityShared.jsx';
import { states, typeLabel } from './customer-model.js';
import { hydrateCustomer, customerErrors, registrationTypes, taxpayerTypes } from './customer-schema.js';

// Um rascunho único mantém os dados ao navegar entre etapas; só a confirmação final persiste.
export function CustomerStepForm({ initial }) {
  const [params] = useSearchParams();
  const [form, setForm] = useState(() =>
    hydrateCustomer(initial || { type: params.get('type') === 'COMPANY' ? 'COMPANY' : 'PERSON' })
  );
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const mutation = useEntityMutation();
  const navigate = useNavigate();
  const locked = useRef(false);
  const root = useRef(null);
  const cep = useCepLookup((address) =>
    setForm((old) => ({
      ...old,
      address: mergeCepAddress(old.address, address, {
        street: 'street',
        neighborhood: 'neighborhood',
        city: 'city',
        state: 'state'
      })
    }))
  );
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const addressChange = (key, value) =>
    setForm((old) => ({ ...old, address: { ...old.address, [key]: value } }));
  const feedback = (key) => ({ error: Boolean(errors[key]), helperText: errors[key] });
  const field = (key, label, required = false, type = 'text') => (
    <TextField
      fullWidth
      label={label}
      required={required}
      type={type}
      value={form[key]}
      onChange={(e) => change(key, e.target.value)}
      {...feedback(key)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
    />
  );
  const grid = {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))' },
    gap: 2.5
  };
  function go(next) {
    setStep(next);
    setErrors({});
    root.current?.scrollIntoView({ block: 'start' });
  }
  async function save() {
    if (locked.current) return;
    locked.current = true;
    try {
      await mutation.mutateAsync({ operation: initial ? 'update' : 'create', id: initial?.id, data: form });
      navigate('/customers', {
        state: {
          customerFeedback: initial ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.'
        }
      });
    } catch (error) {
      setMessage(error.message);
      setConfirm(false);
    } finally {
      locked.current = false;
    }
  }
  function submit(event) {
    event.preventDefault();
    if (locked.current) return;
    const nextErrors = customerErrors(form, step < 2 ? step : undefined);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => root.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    if (step < 2) go(step + 1);
    else if (initial && initial.status !== form.status) setConfirm(true);
    else save();
  }
  const Document = form.type === 'PERSON' ? CpfField : CnpjField;
  return (
    <Box
      ref={root}
      component="form"
      noValidate
      onSubmit={submit}
      sx={{ ...businessFormSx, scrollMarginTop: 90 }}
    >
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {['Dados Gerais', 'Fiscal', 'Financeiro'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      <Box
        component="fieldset"
        disabled={mutation.isPending}
        sx={{
          m: 0,
          p: 0,
          border: 0,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,2fr) minmax(280px,1fr)' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack
          key={step}
          spacing={3}
          sx={{
            animation: 'customerStepReveal 160ms ease-out',
            '@keyframes customerStepReveal': { from: { opacity: 0 }, to: { opacity: 1 } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
          }}
        >
          {step === 0 && (
            <>
              <SectionCard title="Dados Gerais" subtitle={typeLabel(form.type)} sx={businessCardSx}>
                <Box sx={grid}>
                  {initial && (
                    <TextField
                      select
                      label="Tipo de cliente"
                      value={form.type}
                      onChange={(event) =>
                        setForm((old) => ({ ...old, type: event.target.value, document: '' }))
                      }
                    >
                      <MenuItem value="PERSON">Pessoa Física</MenuItem>
                      <MenuItem value="COMPANY">Pessoa Jurídica</MenuItem>
                    </TextField>
                  )}
                  {field(form.type === 'PERSON' ? 'name' : 'tradeName', 'Nome', true)}
                  <Document
                    required
                    value={form.document}
                    onChange={(value) => change('document', value)}
                    {...feedback('document')}
                  />
                  {form.type === 'PERSON' ? field('rg', 'RG', true) : field('legalName', 'Razão Social')}
                  {field(
                    form.type === 'PERSON' ? 'birthDate' : 'registrationDate',
                    form.type === 'PERSON' ? 'Data de nascimento' : 'Data de inscrição',
                    false,
                    'date'
                  )}
                  <FormControlLabel
                    label="Cliente ativo"
                    control={
                      <Switch
                        checked={form.status === 'ACTIVE'}
                        onChange={(e) => change('status', e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                      />
                    }
                  ></FormControlLabel>
                </Box>
              </SectionCard>
              <SectionCard title="Contato" sx={businessCardSx}>
                <Box sx={grid}>
                  {['mobile', 'phone'].map((key) => (
                    <ContactField
                      key={key}
                      kind="phone"
                      label={key === 'mobile' ? 'Celular' : 'Telefone'}
                      value={form[key]}
                      onChange={(value) => change(key, value)}
                      {...feedback(key)}
                    />
                  ))}
                  {field('email', 'E-mail')}
                  {form.type === 'COMPANY' && field('contactName', 'Nome do contato')}
                </Box>
              </SectionCard>
              <SectionCard title="Endereço" sx={businessCardSx}>
                <Box sx={grid}>
                  <ContactField
                    kind="cep"
                    value={form.address.cep}
                    onChange={(value) => {
                      addressChange('cep', value);
                      cep.change(value);
                    }}
                    error={Boolean(errors['address.cep'])}
                    helperText={errors['address.cep'] || cep.feedback}
                  />
                  {[
                    ['street', 'Endereço', true],
                    ['number', 'Número'],
                    ['complement', 'Complemento'],
                    ['neighborhood', 'Bairro', true],
                    ['city', 'Cidade', true]
                  ].map(([key, label, required]) => (
                    <TextField
                      key={key}
                      label={label}
                      required={Boolean(required)}
                      value={form.address[key]}
                      onChange={(e) => addressChange(key, e.target.value)}
                      {...feedback(`address.${key}`)}
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                    />
                  ))}
                  <TextField
                    select
                    label="UF"
                    required
                    value={form.address.state}
                    onChange={(e) => addressChange('state', e.target.value)}
                    {...feedback('address.state')}
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    {states.map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </SectionCard>
              <SectionCard title="Observações" sx={businessCardSx}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Observações"
                  value={form.notes}
                  onChange={(e) => change('notes', e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
              </SectionCard>
            </>
          )}
          {step === 1 && (
            <>
              <SectionCard title="Fiscal" sx={businessCardSx}>
                <TextField
                  fullWidth
                  select
                  label="Tipo de Contribuinte"
                  value={form.taxpayerType}
                  onChange={(e) => change('taxpayerType', e.target.value)}
                  {...feedback('taxpayerType')}
                >
                  {Object.entries(taxpayerTypes).map(([value, label]) => (
                    <MenuItem key={value} value={value} sx={{ whiteSpace: 'normal' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </SectionCard>
              <SectionCard title="Inscrições" sx={businessCardSx}>
                <Box sx={grid}>
                  <TextField
                    select
                    label="Tipo de inscrição"
                    value={form.registrationType}
                    onChange={(e) => change('registrationType', e.target.value)}
                    {...feedback('registrationType')}
                  >
                    {registrationTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                  {field('stateRegistration', 'Inscrição Estadual', form.registrationType !== 'SEM INSC')}
                  {field(
                    'municipalRegistration',
                    'Inscrição Municipal',
                    form.registrationType !== 'SEM INSC'
                  )}
                </Box>
              </SectionCard>
            </>
          )}
          {step === 2 && (
            <SectionCard
              title="Financeiro"
              subtitle="Preferências do cliente. Não gera contas ou movimentações."
              sx={businessCardSx}
            >
              <Stack spacing={3}>
                <FormControlLabel
                  label="Permitir contas a receber"
                  control={
                    <Switch
                      checked={form.financial.allowReceivables}
                      onChange={(e) =>
                        change('financial', { ...form.financial, allowReceivables: e.target.checked })
                      }
                    />
                  }
                />
                <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
                  Permite gerar valores a receber vinculados a este cliente.
                </Box>
                <MoneyField
                  label="Limite de crédito"
                  value={form.financial.creditLimit}
                  {...feedback('creditLimit')}
                  onChange={(value) => change('financial', { ...form.financial, creditLimit: value })}
                />
              </Stack>
            </SectionCard>
          )}
        </Stack>
        <EntitySummary customer={form} />
      </Box>
      <StickyFormActions>
        <Button
          variant="outlined"
          disabled={mutation.isPending}
          onClick={() => (step ? go(step - 1) : navigate('/customers'))}
        >
          {step ? 'Voltar' : 'Cancelar'}
        </Button>
        <CreateButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Salvando...'
            : step < 2
              ? 'Próximo'
              : initial
                ? 'Salvar alterações'
                : 'Cadastrar cliente'}
        </CreateButton>
      </StickyFormActions>
      <ConfirmDialog
        open={confirm}
        title="Alterar status do cliente?"
        description="A alteração de status será salva junto com o cadastro."
        confirmLabel="Salvar alterações"
        loading={mutation.isPending}
        onConfirm={save}
        onClose={() => setConfirm(false)}
      />
    </Box>
  );
}
CustomerStepForm.propTypes = { initial: PropTypes.object };
