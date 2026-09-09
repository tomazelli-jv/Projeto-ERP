import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

const empty = {
  nomeFuncionario: '',
  userName: '',
  email: '',
  password: '',
  confirmation: '',
  ativo: true,
  idPerfil: '',
  idsLojas: []
};

// Dialog mantém senha somente em estado efêmero e a apaga sempre que abre/fecha ou conclui a operação.
export function UserAccessDialog({
  open,
  user,
  currentUserId,
  profiles,
  stores,
  loading,
  apiError,
  onClose,
  onSubmit
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            nomeFuncionario: user.funcionario.nome,
            userName: user.userName,
            email: user.email,
            password: '',
            confirmation: '',
            ativo: user.ativo,
            idPerfil: user.perfil?.idPerfil ?? '',
            idsLojas: user.lojas.map((store) => store.idLoja)
          }
        : empty
    );
    setErrors({});
  }, [open, user]);

  const set = (field) => (event) =>
    setForm((current) => ({
      ...current,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));
  const toggleStore = (id) =>
    setForm((current) => ({
      ...current,
      idsLojas: current.idsLojas.includes(id)
        ? current.idsLojas.filter((item) => item !== id)
        : [...current.idsLojas, id]
    }));

  // Validação replica os limites públicos e evita enviar confirmação de senha ao backend.
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!form.nomeFuncionario.trim()) next.nomeFuncionario = 'Informe o nome.';
    if (!form.userName.trim()) next.userName = 'Informe o usuário.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Informe um e-mail válido.';
    if (!user && (form.password.length < 12 || form.password.length > 128 || !/\S/.test(form.password)))
      next.password = 'Use entre 12 e 128 caracteres.';
    if (!user && form.password !== form.confirmation) next.confirmation = 'As senhas não conferem.';
    if (!form.idPerfil) next.idPerfil = 'Selecione um perfil.';
    setErrors(next);
    if (Object.keys(next).length === 0)
      onSubmit({
        ...form,
        email: form.email.trim().toLowerCase(),
        nomeFuncionario: form.nomeFuncionario.trim(),
        userName: form.userName.trim()
      });
  }

  const self = user?.idUsuario === currentUserId;
  return (
    <Dialog
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby="user-access-title"
    >
      <DialogTitle id="user-access-title">{user ? 'Editar acesso' : 'Novo funcionário'}</DialogTitle>
      <DialogContent>
        <Stack component="form" id="user-access-form" onSubmit={submit} spacing={3} sx={{ pt: 1 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <Typography fontWeight={700} variant="overline">
            Dados pessoais
          </Typography>
          <TextField
            autoFocus
            label="Nome"
            value={form.nomeFuncionario}
            onChange={set('nomeFuncionario')}
            error={Boolean(errors.nomeFuncionario)}
            helperText={errors.nomeFuncionario}
            required
            inputProps={{ maxLength: 160 }}
          />
          <Typography fontWeight={700} variant="overline">
            Acesso ao sistema
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Usuário"
              value={form.userName}
              onChange={set('userName')}
              error={Boolean(errors.userName)}
              helperText={errors.userName}
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              fullWidth
              label="E-mail"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              required
              inputProps={{ maxLength: 254 }}
            />
          </Stack>
          {!user && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={form.password}
                onChange={set('password')}
                error={Boolean(errors.password)}
                helperText={errors.password ?? 'Mínimo de 12 caracteres.'}
                required
                inputProps={{ minLength: 12, maxLength: 128 }}
              />
              <TextField
                fullWidth
                label="Confirmar senha"
                type="password"
                value={form.confirmation}
                onChange={set('confirmation')}
                error={Boolean(errors.confirmation)}
                helperText={errors.confirmation}
                required
              />
            </Stack>
          )}
          <FormControlLabel
            control={<Switch checked={form.ativo} onChange={set('ativo')} disabled={self} />}
            label={form.ativo ? 'Usuário ativo' : 'Usuário inativo'}
          />
          {self && <FormHelperText>Você não pode inativar sua própria conta.</FormHelperText>}
          <Typography fontWeight={700} variant="overline">
            Perfil
          </Typography>
          <FormControl error={Boolean(errors.idPerfil)} required>
            <InputLabel id="profile-label">Perfil</InputLabel>
            <Select labelId="profile-label" label="Perfil" value={form.idPerfil} onChange={set('idPerfil')}>
              {profiles.map((profile) => (
                <MenuItem key={profile.idPerfil} value={profile.idPerfil}>
                  {profile.nome}
                </MenuItem>
              ))}
            </Select>
            {errors.idPerfil && <FormHelperText>{errors.idPerfil}</FormHelperText>}
          </FormControl>
          <Typography fontWeight={700} variant="overline">
            Lojas permitidas
          </Typography>
          <FormGroup>
            {stores.map((store) => {
              const selected = form.idsLojas.includes(store.idLoja);
              return (
                <FormControlLabel
                  key={store.idLoja}
                  control={
                    <Checkbox
                      checked={selected}
                      disabled={!store.ativo && !selected}
                      onChange={() => toggleStore(store.idLoja)}
                    />
                  }
                  label={`${store.nomeFantasia}${store.ativo ? '' : ' (inativa)'}`}
                />
              );
            })}
            {stores.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                Nenhuma loja disponível.
              </Typography>
            )}
          </FormGroup>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={loading} onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={loading} form="user-access-form" type="submit" variant="contained">
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

UserAccessDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  user: PropTypes.object,
  currentUserId: PropTypes.string,
  profiles: PropTypes.array.isRequired,
  stores: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  apiError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};
