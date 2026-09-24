import { CreateButton } from '../common/CreateButton.jsx';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { AppBreadcrumbs } from '../common/AppBreadcrumbs.jsx';
import { CnpjField } from './CnpjField.jsx';
import { CpfField } from './CpfField.jsx';
import { ContactField } from './ContactField.jsx';
import { useCepLookup } from '../../app/useCepLookup.js';
import { mergeCepAddress } from '../../api/cep.js';
import { addressLines, documentLabel, documentValue, validateLoja } from './business-model.js';
import { businessDensitySx, businessCardSx, businessFormSx } from './business-styles.js';

// Montado por abertura: rascunho isolado do cache e descartado somente por cancelar/sucesso.
export function BusinessFormDialog({ kind, record, company, loading, apiError, onClose, onSubmit }) {
  const store = kind === 'loja',
    editing = Boolean(record);
  const SubmitButton = editing ? Button : CreateButton;
  const [form, setForm] = useState(() => ({
    nome: '',
    razaoSocial: '',
    tipoPessoa: 2,
    documento: '',
    telefone: '',
    email: '',
    cep: '',
    cidade: '',
    rua: '',
    uf: '',
    ativo: true,
    ...Object.fromEntries(Object.entries(record ?? {}).map(([key, value]) => [key, value ?? '']))
  }));
  // Somente campos reais do DTO; número/complemento e campos não mapeados ficam intactos.
  const cepLookup = useCepLookup((address) =>
    setForm((previous) => mergeCepAddress(previous, address, { street: 'rua', city: 'cidade', state: 'uf' }))
  );
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const Icon = store ? StorefrontOutlinedIcon : BusinessOutlinedIcon;
  const title = `${editing ? 'Editar' : 'Cadastrar'} ${store ? 'loja' : 'empresa'}`;
  const change = (name) => (event) => setForm((previous) => ({ ...previous, [name]: event.target.value }));
  // Guard síncrono impede envio duplo; status é decidido em confirmação na página proprietária.
  async function submit(event) {
    event.preventDefault();
    if (loading || submitting.current) return;
    const message = store ? validateLoja(form) : !form.nome.trim() ? 'Informe o nome da empresa.' : '';
    setError(message);
    if (message) return;
    submitting.current = true;
    try {
      await onSubmit({ ...form, ...(store ? { empresaId: company.id } : {}) });
    } finally {
      submitting.current = false;
    }
  }
  const field = (name, label, maximum, required = false) =>
    // Toda exibição rotulada CNPJ usa o campo limitado, inclusive registros legados sem tipo válido.
    name === 'documento' && Number(form.tipoPessoa) !== 1 ? (
      <CnpjField
        value={form.documento}
        required={required}
        onChange={(documento) => setForm((previous) => ({ ...previous, documento }))}
      />
    ) : name === 'documento' ? (
      <CpfField
        value={form.documento}
        required={required}
        onChange={(documento) => setForm((previous) => ({ ...previous, documento }))}
      />
    ) : name === 'telefone' || name === 'cep' ? (
      <ContactField
        kind={name === 'telefone' ? 'phone' : 'cep'}
        value={form[name]}
        required={required}
        helperText={name === 'cep' ? cepLookup.feedback : undefined}
        onChange={(value) => {
          setForm((previous) => ({ ...previous, [name]: value }));
          if (name === 'cep') cepLookup.change(value);
        }}
      />
    ) : (
      <TextField
        fullWidth
        required={required}
        label={label}
        value={form[name]}
        onChange={change(name)}
        type={name === 'email' ? 'email' : 'text'}
        slotProps={{ htmlInput: maximum ? { maxLength: maximum } : {} }}
      />
    );
  const grid = {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
    gap: 2
  };
  return (
    <Dialog
      sx={businessDensitySx}
      open
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      onClose={loading ? undefined : onClose}
      aria-labelledby="business-form-title"
    >
      {/* O formulário mantém a mesma hierarquia visual das páginas, sem um segundo título de seção. */}
      <DialogTitle component="div">
        <AppBreadcrumbs items={store ? ['Empresas', 'Lojas', title] : ['Empresas', title]} />
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography component="h2" variant="h2" id="business-form-title">
            {title}
          </Typography>
          {!editing && <Chip size="small" label="Novo cadastro" color="primary" variant="outlined" />}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box component="form" id="business-form" onSubmit={submit} sx={{ ...businessFormSx, pt: 1 }}>
          {(apiError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError || error}
            </Alert>
          )}
          <Box
            component="fieldset"
            disabled={loading}
            sx={{
              border: 0,
              p: 0,
              m: 0,
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'minmax(0,1.7fr) minmax(0,1fr)' },
              gap: 2,
              alignItems: 'start'
            }}
          >
            <Stack spacing={2}>
              <SectionCard
                title={store ? 'Dados da loja' : 'Dados da empresa'}
                subtitle="Informações de identificação do cadastro."
                icon={Icon}
                sx={businessCardSx}
              >
                <Box sx={grid}>
                  {field('nome', store ? 'Nome / Nome fantasia' : 'Nome', store ? 100 : undefined, true)}
                  {store && (
                    <>
                      {field('razaoSocial', 'Razão social', 100)}
                      <TextField
                        select
                        label="Tipo de pessoa"
                        value={form.tipoPessoa}
                        onChange={change('tipoPessoa')}
                      >
                        <MenuItem value={1}>Física</MenuItem>
                        <MenuItem value={2}>Jurídica</MenuItem>
                      </TextField>
                      {field('documento', Number(form.tipoPessoa) === 1 ? 'CPF' : 'CNPJ', undefined, true)}
                    </>
                  )}
                </Box>
              </SectionCard>
              {store && (
                <>
                  <SectionCard title="Contato" icon={ContactMailOutlinedIcon} sx={businessCardSx}>
                    <Box sx={grid}>
                      {field('telefone', 'Telefone', 15)}
                      {field('email', 'E-mail', 254)}
                    </Box>
                  </SectionCard>
                  <SectionCard title="Endereço" icon={LocationOnOutlinedIcon} sx={businessCardSx}>
                    <Box sx={grid}>
                      {field('rua', 'Rua', 200)}
                      {field('cep', 'CEP')}
                      {field('cidade', 'Cidade', 150)}
                      {field('uf', 'UF', 2)}
                    </Box>
                  </SectionCard>
                </>
              )}
              <SectionCard
                title={store ? 'Vínculo e situação' : 'Situação'}
                icon={BusinessOutlinedIcon}
                sx={businessCardSx}
              >
                <Stack spacing={2}>
                  {store && (
                    <TextField
                      label="Empresa"
                      value={company.nome}
                      slotProps={{ input: { readOnly: true } }}
                    />
                  )}
                  {editing ? (
                    <TextField
                      select
                      label="Status"
                      value={String(form.ativo)}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, ativo: event.target.value === 'true' }))
                      }
                    >
                      <MenuItem value="true">Ativa</MenuItem>
                      <MenuItem value="false">Inativa</MenuItem>
                    </TextField>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      A loja será criada ativa.
                    </Typography>
                  )}
                </Stack>
              </SectionCard>
            </Stack>
            <SectionCard sx={businessCardSx}>
              <Stack alignItems="center" spacing={1} sx={{ pb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'surface.secondary', color: 'text.secondary' }}>
                  <Icon sx={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant="h3" sx={{ overflowWrap: 'anywhere', textAlign: 'center' }}>
                  {form.nome || 'Novo cadastro'}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Resumo do cadastro
                </Typography>
              </Stack>
              <Divider />
              <Stack spacing={2} sx={{ py: 2 }}>
                {(store
                  ? [
                      ['Empresa', company.nome],
                      [
                        documentLabel({ tipoPessoa: Number(form.tipoPessoa) }),
                        documentValue({ ...form, tipoPessoa: Number(form.tipoPessoa) })
                      ],
                      ['E-mail', form.email],
                      ['Endereço', addressLines(form).join(', ')]
                    ]
                  : [['Nome', form.nome]]
                ).map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{value || 'Não informado'}</Typography>
                  </Box>
                ))}
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" sx={{ pt: 2.5 }}>
                <Typography color="text.secondary">Status</Typography>
                <Chip
                  size="small"
                  label={form.ativo ? 'Ativa' : 'Inativa'}
                  color={form.ativo ? 'success' : 'error'}
                />
              </Stack>
            </SectionCard>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, '& .MuiButton-root': { minHeight: 36, px: 2 } }}>
        <Button variant="outlined" disabled={loading} onClick={onClose}>
          Cancelar
        </Button>
        <SubmitButton type="submit" form="business-form" variant="contained" disabled={loading}>
          {loading ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar loja'}
        </SubmitButton>
      </DialogActions>
    </Dialog>
  );
}
BusinessFormDialog.propTypes = {
  kind: PropTypes.string.isRequired,
  record: PropTypes.object,
  company: PropTypes.object,
  loading: PropTypes.bool,
  apiError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};
