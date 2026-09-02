import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// Dialog mantém uma cópia editável da empresa para não alterar o cache antes da confirmação do usuário.
export function EmpresaFormDialog({ empresa, open, loading, apiError, onClose, onSubmit }) {
  const [form, setForm] = useState({ nome: '', ativo: true });
  const [errors, setErrors] = useState({});

  // Cada abertura repõe os valores confirmados pela API e descarta tentativas anteriores canceladas.
  useEffect(() => {
    if (open && empresa) {
      setForm({ nome: empresa.nome, ativo: empresa.ativo });
      setErrors({});
    }
  }, [empresa, open]);

  // Validação de UX replica apenas regras estáveis; o backend continua sendo a autoridade final.
  function handleSubmit(event) {
    event.preventDefault();
    const nome = form.nome.trim();
    const nextErrors = {};
    if (!nome) nextErrors.nome = 'Informe o nome da empresa.';
    else if (nome.length > 160) nextErrors.nome = 'Use no máximo 160 caracteres.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit({ nome, ativo: form.ativo });
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={loading ? undefined : onClose} open={open}>
      <DialogTitle>Editar empresa</DialogTitle>
      <DialogContent>
        <Stack component="form" id="empresa-form" onSubmit={handleSubmit} spacing={2.5} sx={{ pt: 1 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <TextField
            autoFocus
            error={Boolean(errors.nome)}
            fullWidth
            helperText={errors.nome}
            label="Nome *"
            onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            value={form.nome}
          />
          <TextField
            fullWidth
            label="Status"
            onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.value === 'true' }))}
            select
            value={String(form.ativo)}
          >
            <MenuItem value="true">Ativa</MenuItem>
            <MenuItem value="false">Inativa</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={loading} onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={loading} form="empresa-form" type="submit" variant="contained">
          {loading && <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />}
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmpresaFormDialog.propTypes = {
  empresa: PropTypes.object,
  open: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  apiError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};
