import { useEntityModule } from './entity-module.js';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { CreateButton } from '../../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { LoadingState } from '../../components/feedback/LoadingState.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { CpfField } from '../../components/business/CpfField.jsx';
import { CnpjField } from '../../components/business/CnpjField.jsx';
import { ContactField } from '../../components/business/ContactField.jsx';
import { businessCardSx, businessFormSx } from '../../components/business/business-styles.js';
import { useCepLookup } from '../../app/useCepLookup.js';
import { mergeCepAddress } from '../../api/cep.js';
import { useEntityDetail, useEntityMutation } from './entity-queries.js';
import { states } from '../customers/customer-model.js';
import { EntityDemoNotice, EntitySummary } from './EntityShared.jsx';
import { EntityProfile } from './EntityProfile.jsx';

// Rotas distintas compartilham o mesmo editor; trocar o id remonta o rascunho, não o cache global.
export function EntityEditorPage({ mode }) {
  const module = useEntityModule();
  const { id } = useParams();
  const query = useEntityDetail(mode === 'create' ? null : id);
  const title =
    mode === 'create'
      ? `Cadastrar ${module.singular}`
      : mode === 'edit'
        ? `Editar ${module.singular}`
        : `Perfil do ${module.singular}`;
  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === 'create'
            ? `Preencha os dados para cadastrar um novo ${module.singular}.`
            : `Consulte os dados de identificação e contato do ${module.singular}.`
        }
        action={
          <Button component={Link} to={module.path} startIcon={<ArrowBackIcon />} variant="outlined">
            Voltar para a lista
          </Button>
        }
      />
      {!import.meta.env.DEV ? (
        <Alert severity="info">{`${module.Plural} aguarda integração com o backend.`}</Alert>
      ) : (
        <>
          <EntityDemoNotice />
          {mode !== 'create' && query.isPending ? (
            <LoadingState message={`Carregando ${module.singular}...`} />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : mode !== 'create' && !query.data ? (
            <EmptyState
              title={`${module.Singular} não encontrado.`}
              description="O cadastro não está disponível neste contexto."
              action={
                <Button component={Link} to={module.path}>
                  Voltar para a lista
                </Button>
              }
            />
          ) : mode === 'view' ? (
            <EntityProfile customer={query.data} />
          ) : (
            <EntityForm key={id ?? 'new'} initial={mode === 'create' ? null : query.data} />
          )}
        </>
      )}
    </>
  );
}
EntityEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
function EntityForm({ initial }) {
  const module = useEntityModule();
  const [form, setForm] = useState(() => (initial ? structuredClone(initial) : module.empty()));
  const [error, setError] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const mutation = useEntityMutation();
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
    const message = module.validate(form);
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
      navigate(module.path, {
        state: {
          customerFeedback: initial
            ? `${module.Singular} atualizado com sucesso.`
            : `${module.Singular} cadastrado com sucesso.`
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
        title={form.status === 'ACTIVE' ? `Ativar ${module.singular}?` : `Inativar ${module.singular}?`}
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
                label={`Tipo de ${module.singular}`}
                value={form.type}
                onChange={(e) => setForm((old) => ({ ...old, type: e.target.value, document: '' }))}
              >
                <MenuItem value="PERSON">Pessoa Física</MenuItem>
                <MenuItem value="COMPANY">Pessoa Jurídica</MenuItem>
              </TextField>
              <FormControlLabel
                label={`${module.Singular} ativo`}
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
                  {!module.commercial && (
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
                  )}
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
          {module.commercial && (
            <SectionCard title="Dados comerciais" icon={ContactMailOutlinedIcon} sx={businessCardSx}>
              <Box sx={grid}>
                {field('commercialContact', 'Nome do contato comercial')}
                {form.type === 'COMPANY' ? (
                  <>
                    {field('commercialEmail', 'E-mail comercial')}
                    <ContactField
                      kind="phone"
                      label="Telefone comercial"
                      value={form.commercialPhone}
                      onChange={(value) => change('commercialPhone', value)}
                    />
                  </>
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Observações comerciais"
                    value={form.commercialNotes}
                    onChange={(event) => change('commercialNotes', event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 4000 } }}
                  />
                )}
              </Box>
            </SectionCard>
          )}
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
        <EntitySummary customer={form} />
        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ gridColumn: '1 / -1' }}>
          <Button component={Link} to={module.path} variant="outlined" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Submit type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Salvando...'
              : initial
                ? 'Salvar alterações'
                : `Cadastrar ${module.singular}`}
          </Submit>
        </Stack>
      </Box>
    </Box>
  );
}
EntityForm.propTypes = { initial: PropTypes.object };
