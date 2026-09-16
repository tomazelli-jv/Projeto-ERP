import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
  formatCep,
  formatCnpj,
  formatPhone,
  normalizeCnpj,
  onlyDigits,
  validateCnpj
} from './business-formatters.js';

const emptyForm = {
  razaoSocial: '',
  nomeFantasia: '',
  documento: '',
  telefone: '',
  email: '',
  cep: '',
  rua: '',
  cidade: '',
  uf: '',
  ativo: true
};

// O mesmo formulário atende criação e edição para manter máscaras, validações e acessibilidade consistentes.
export function LojaFormDialog({ loja, open, loading, apiError, disableStatus = false, onClose, onSubmit }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Valores da API são mascarados apenas ao entrar no formulário; o cache remoto permanece inalterado.
  useEffect(() => {
    if (!open) return;
    setForm(
      loja
        ? {
            razaoSocial: loja.razaoSocial ?? '',
            nomeFantasia: loja.nomeFantasia ?? '',
            documento: loja.tipoPessoa === 1 ? loja.documento : formatCnpj(loja.documento),
            telefone: formatPhone(loja.telefone),
            email: loja.email ?? '',
            cep: formatCep(loja.cep),
            rua: loja.rua ?? '',
            cidade: loja.cidade ?? '',
            uf: loja.uf ?? '',
            ativo: loja.ativo
          }
        : emptyForm
    );
    setErrors({});
  }, [loja, open]);

  // Atualização imutável mantém cada campo controlado e evita mutar o objeto retornado pela query.
  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Validações antecipam erros comuns sem substituir as regras definitivas executadas pela API.
  function validate() {
    const next = {};
    if (form.razaoSocial.trim().length > 100) next.razaoSocial = 'Use no máximo 100 caracteres.';
    if (!form.nomeFantasia.trim()) next.nomeFantasia = 'Informe o nome fantasia.';
    else if (form.nomeFantasia.trim().length > 100) next.nomeFantasia = 'Use no máximo 100 caracteres.';
    if (loja?.tipoPessoa !== 1 && !validateCnpj(form.documento)) next.documento = 'CNPJ inválido.';
    if (form.telefone && onlyDigits(form.telefone, 30).length > 15)
      next.telefone = 'Use no máximo 15 dígitos.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Informe um e-mail válido.';
    if (form.cep && onlyDigits(form.cep, 8).length !== 8) next.cep = 'Informe os 8 dígitos do CEP.';
    const limits = { rua: 200, cidade: 100, email: 150 };
    Object.entries(limits).forEach(([field, maximum]) => {
      if (form[field].trim().length > maximum) next[field] = `Use no máximo ${maximum} caracteres.`;
    });
    if (form.uf && !/^[A-Z]{2}$/.test(form.uf)) next.uf = 'Informe duas letras maiúsculas.';
    return next;
  }

  // O submit envia CNPJ uppercase sem pontuação; a API é a autoridade, mas ainda precisa aceitar letras no CNPJ.
  function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim(),
      // CPF existente é preservado; esta tela cria estabelecimentos jurídicos.
      tipoPessoa: loja?.tipoPessoa ?? 2,
      documento: loja?.tipoPessoa === 1 ? loja.documento : normalizeCnpj(form.documento),
      telefone: onlyDigits(form.telefone, 20) || null,
      email: form.email.trim() || null,
      cep: onlyDigits(form.cep, 8) || null,
      rua: form.rua.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf || null,
      ativo: form.ativo
    });
  }

  // Grid usa uma coluna no mobile e duas no desktop; o Dialog vira tela cheia em dispositivos estreitos.
  const field = (name, label, options = {}) => (
    <TextField
      error={Boolean(errors[name])}
      fullWidth
      helperText={errors[name]}
      label={label}
      onChange={(event) =>
        change(name, options.transform ? options.transform(event.target.value) : event.target.value)
      }
      disabled={loading || (name === 'documento' && loja?.tipoPessoa === 1)}
      value={form[name]}
      {...(options.inputProps && { inputProps: options.inputProps })}
    />
  );

  return (
    <Dialog
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      onClose={loading ? undefined : onClose}
      open={open}
    >
      <DialogTitle>{loja ? 'Editar loja' : 'Cadastrar loja'}</DialogTitle>
      <DialogContent>
        <Stack component="form" id="loja-form" onSubmit={handleSubmit} spacing={2.5} sx={{ pt: 1 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>{field('razaoSocial', 'Razão social')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('nomeFantasia', 'Nome / Nome fantasia *')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {field('documento', loja?.tipoPessoa === 1 ? 'CPF' : 'CNPJ *', { transform: formatCnpj })}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('telefone', 'Telefone', { transform: formatPhone })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('email', 'E-mail')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('cep', 'CEP', { transform: formatCep })}</Grid>
            <Grid size={{ xs: 12, md: 8 }}>{field('rua', 'Rua')}</Grid>
            <Grid size={{ xs: 12, md: 8 }}>{field('cidade', 'Cidade')}</Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {field('uf', 'UF', {
                transform: (value) =>
                  value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, '')
                    .slice(0, 2),
                inputProps: { maxLength: 2 }
              })}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                // A loja ativa permanece definida pelo JWT; não pode ser invalidada por este formulário.
                disabled={disableStatus || !loja}
                helperText={
                  disableStatus
                    ? 'Troque de loja antes de inativar esta unidade.'
                    : !loja
                      ? 'Novas lojas são criadas ativas.'
                      : undefined
                }
                label="Status"
                onChange={(event) => change('ativo', event.target.value === 'true')}
                select
                value={String(form.ativo)}
              >
                <MenuItem value="true">Ativa</MenuItem>
                <MenuItem value="false">Inativa</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={loading} onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={loading} form="loja-form" type="submit" variant="contained">
          {loading && <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />}
          {loading ? 'Salvando...' : loja ? 'Salvar alterações' : 'Cadastrar loja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

LojaFormDialog.propTypes = {
  loja: PropTypes.object,
  disableStatus: PropTypes.bool,
  open: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  apiError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};
