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
import { formatCep, formatCnpj, formatPhone, onlyDigits } from './business-formatters.js';

const emptyForm = {
  razaoSocial: '',
  nomeFantasia: '',
  documento: '',
  telefone: '',
  email: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  ativo: true
};

// O mesmo formulário atende criação e edição para manter máscaras, validações e acessibilidade consistentes.
export function LojaFormDialog({ loja, open, loading, apiError, onClose, onSubmit }) {
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
            documento: formatCnpj(loja.documento),
            telefone: formatPhone(loja.telefone),
            email: loja.email ?? '',
            cep: formatCep(loja.cep),
            rua: loja.rua ?? '',
            numero: loja.numero ?? '',
            complemento: loja.complemento ?? '',
            bairro: loja.bairro ?? '',
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
    if (!form.razaoSocial.trim()) next.razaoSocial = 'Informe a razão social.';
    else if (form.razaoSocial.trim().length > 180) next.razaoSocial = 'Use no máximo 180 caracteres.';
    if (!form.nomeFantasia.trim()) next.nomeFantasia = 'Informe o nome fantasia.';
    else if (form.nomeFantasia.trim().length > 180) next.nomeFantasia = 'Use no máximo 180 caracteres.';
    if (onlyDigits(form.documento, 14).length !== 14) next.documento = 'Informe os 14 dígitos do CNPJ.';
    if (form.telefone && onlyDigits(form.telefone, 30).length > 20)
      next.telefone = 'Use no máximo 20 dígitos.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Informe um e-mail válido.';
    if (form.cep && onlyDigits(form.cep, 8).length !== 8) next.cep = 'Informe os 8 dígitos do CEP.';
    const limits = { rua: 180, numero: 30, complemento: 120, bairro: 120, cidade: 120 };
    Object.entries(limits).forEach(([field, maximum]) => {
      if (form[field].trim().length > maximum) next[field] = `Use no máximo ${maximum} caracteres.`;
    });
    if (form.uf && !/^[A-Z]{2}$/.test(form.uf)) next.uf = 'Informe duas letras maiúsculas.';
    return next;
  }

  // O submit remove somente máscaras e espaços externos, enviando exclusivamente campos aceitos pelo backend.
  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim(),
      documento: onlyDigits(form.documento, 14),
      telefone: onlyDigits(form.telefone, 20) || null,
      email: form.email.trim() || null,
      cep: onlyDigits(form.cep, 8) || null,
      rua: form.rua.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
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
            <Grid size={{ xs: 12, md: 6 }}>{field('razaoSocial', 'Razão social *')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('nomeFantasia', 'Nome fantasia *')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('documento', 'CNPJ *', { transform: formatCnpj })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('telefone', 'Telefone', { transform: formatPhone })}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('email', 'E-mail')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('cep', 'CEP', { transform: formatCep })}</Grid>
            <Grid size={{ xs: 12, md: 8 }}>{field('rua', 'Rua')}</Grid>
            <Grid size={{ xs: 12, md: 4 }}>{field('numero', 'Número')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('complemento', 'Complemento')}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{field('bairro', 'Bairro')}</Grid>
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
  open: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  apiError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};
