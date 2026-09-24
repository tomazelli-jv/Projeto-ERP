import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { CreateButton } from '../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { CpfField } from '../components/business/CpfField.jsx';
import { CnpjField } from '../components/business/CnpjField.jsx';
import { ContactField } from '../components/business/ContactField.jsx';
import { businessCardSx, businessFormSx } from '../components/business/business-styles.js';
import { useCepLookup } from '../app/useCepLookup.js';
import { mergeCepAddress } from '../api/cep.js';
import { useCustomerDetail, useCustomerMutation } from '../features/customers/customer-queries.js';
import { emptyCustomer, states, validateCustomer } from '../features/customers/customer-model.js';
import { CustomerDemoNotice, CustomerSummary } from '../features/customers/CustomerShared.jsx';
import { CustomerProfile } from '../features/customers/CustomerProfile.jsx';

// Rotas distintas compartilham o mesmo editor; trocar o id remonta o rascunho, não o cache global.
export function CustomerEditorPage({ mode }) {
  const { id } = useParams();
  const query = useCustomerDetail(mode === 'create' ? null : id);
  const title =
    mode === 'create' ? 'Cadastrar cliente' : mode === 'edit' ? 'Editar cliente' : 'Perfil do cliente';
  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === 'create'
            ? 'Preencha os dados para cadastrar um novo cliente.'
            : 'Consulte os dados de identificação e contato do cliente.'
        }
        action={
          <Button component={Link} to="/customers" startIcon={<ArrowBackIcon />} variant="outlined">
            Voltar para a lista
          </Button>
        }
      />
      {!import.meta.env.DEV ? (
        <Alert severity="info">Clientes aguarda integração com o backend.</Alert>
      ) : (
        <>
          <CustomerDemoNotice />
          {mode !== 'create' && query.isPending ? (
            <LoadingState message="Carregando cliente..." />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : mode !== 'create' && !query.data ? (
            <EmptyState
              title="Cliente não encontrado."
              description="O cadastro não está disponível neste contexto."
              action={
                <Button component={Link} to="/customers">
                  Voltar para a lista
                </Button>
              }
            />
          ) : mode === 'view' ? (
            <CustomerProfile customer={query.data} />
          ) : (
            <CustomerForm key={id ?? 'new'} initial={mode === 'create' ? null : query.data} />
          )}
        </>
      )}
    </>
  );
}
CustomerEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
function CustomerForm({ initial }) {
  const [form, setForm] = useState(() => (initial ? structuredClone(initial) : emptyCustomer()));
  const [error, setError] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const mutation = useCustomerMutation();
  const navigate = useNavigate();
  const lock = useRef(false);
  const errorRef = useRef(null);
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
  const change = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  const addressChange = (name, value) =>
    setForm((old) => ({ ...old, address: { ...old.address, [name]: value } }));
  const field = (name, label, required = false) => (
    <TextField
      fullWidth
      label={label}
      required={required}
      value={form[name]}
      onChange={(e) => change(name, e.target.value)}
      slotProps={{ htmlInput: { maxLength: 200 } }}
    />
  );
  const grid = {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
    gap: 2.5
  };
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const message = validateCustomer(form);
    if (message) {
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (initial && initial.status !== form.status) {
      setConfirmStatus(true);
      return;
    }
    await save();
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await mutation.mutateAsync({ operation: initial ? 'update' : 'create', id: initial?.id, data: form });
      navigate('/customers', {
        state: {
          customerFeedback: initial ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.'
        }
      });
    } catch (cause) {
      setConfirmStatus(false);
      setError(cause.message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      lock.current = false;
    }
  }
  const Submit = initial ? Button : CreateButton;
  return (
    <Box component="form" onSubmit={submit} sx={businessFormSx}>
      <ConfirmDialog
        open={confirmStatus}
        title={form.status === 'ACTIVE' ? 'Ativar cliente?' : 'Inativar cliente?'}
        description="A alteração de status será salva junto com os dados do cadastro. O histórico será preservado."
        confirmLabel="Salvar alterações"
        loading={mutation.isPending}
        onClose={() => setConfirmStatus(false)}
        onConfirm={save}
      />
      {error && (
        <Alert ref={errorRef} tabIndex={-1} severity="error" sx={{ mb: 2 }}>
          {error}
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
          gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1.7fr) minmax(300px,1fr)' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack spacing={3}>
          <SectionCard title="Dados principais" icon={PersonOutlineIcon} sx={businessCardSx}>
            <Box sx={grid}>
              <TextField
                select
                label="Tipo de cliente"
                value={form.type}
                onChange={(e) => setForm((old) => ({ ...old, type: e.target.value, document: '' }))}
              >
                <MenuItem value="PERSON">Pessoa Física</MenuItem>
                <MenuItem value="COMPANY">Pessoa Jurídica</MenuItem>
              </TextField>
              <FormControlLabel
                label="Cliente ativo"
                control={
                  <Switch
                    checked={form.status === 'ACTIVE'}
                    onChange={(e) => change('status', e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                  />
                }
              />
              {form.type === 'PERSON' ? (
                <>
                  {field('name', 'Nome completo', true)}
                  <CpfField required value={form.document} onChange={(value) => change('document', value)} />
                  <TextField
                    type="date"
                    label="Data de nascimento"
                    value={form.birthDate}
                    onChange={(e) => change('birthDate', e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { max: new Date().toISOString().slice(0, 10) }
                    }}
                  />
                </>
              ) : (
                <>
                  {field('legalName', 'Razão social', true)}
                  {field('tradeName', 'Nome fantasia')}
                  <CnpjField required value={form.document} onChange={(value) => change('document', value)} />
                  {field('stateRegistration', 'Inscrição estadual')}
                  {field('municipalRegistration', 'Inscrição municipal')}
                </>
              )}
            </Box>
          </SectionCard>
          <SectionCard title="Contato" icon={ContactMailOutlinedIcon} sx={businessCardSx}>
            <Box sx={grid}>
              {form.type === 'COMPANY' && field('contactName', 'Nome do contato')}
              {field('email', 'E-mail')}
              <ContactField kind="phone" value={form.phone} onChange={(value) => change('phone', value)} />
              <ContactField
                kind="phone"
                label="Celular"
                value={form.mobile}
                onChange={(value) => change('mobile', value)}
              />
            </Box>
          </SectionCard>
          <SectionCard title="Endereço" icon={LocationOnOutlinedIcon} sx={businessCardSx}>
            <Box sx={grid}>
              <ContactField
                kind="cep"
                value={form.address.cep}
                helperText={cep.feedback}
                onChange={(value) => {
                  addressChange('cep', value);
                  cep.change(value);
                }}
              />
              {[
                ['street', 'Logradouro'],
                ['number', 'Número'],
                ['complement', 'Complemento'],
                ['neighborhood', 'Bairro'],
                ['city', 'Cidade']
              ].map(([name, label]) => (
                <TextField
                  key={name}
                  label={label}
                  value={form.address[name]}
                  onChange={(e) => addressChange(name, e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              ))}
              <TextField
                select
                label="UF"
                value={form.address.state}
                onChange={(e) => addressChange('state', e.target.value)}
              >
                <MenuItem value="">Não informada</MenuItem>
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </SectionCard>
          <SectionCard title="Observações" icon={NotesOutlinedIcon} sx={businessCardSx}>
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
        </Stack>
        <CustomerSummary customer={form} />
        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ gridColumn: '1 / -1' }}>
          <Button component={Link} to="/customers" variant="outlined" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Submit type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : initial ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Submit>
        </Stack>
      </Box>
    </Box>
  );
}
CustomerForm.propTypes = { initial: PropTypes.object };
