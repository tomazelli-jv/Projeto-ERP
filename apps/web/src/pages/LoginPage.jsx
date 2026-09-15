import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../app/auth/auth-context.js';

// Mensagens locais traduzem os códigos públicos de autenticação sem expor detalhes internos.
const authMessages = {
  CREDENCIAIS_INVALIDAS: 'Usuário ou senha inválidos.',
  USUARIO_INATIVO: 'Este usuário está inativo.',
  FUNCIONARIO_SEM_LOJA: 'Seu usuário não possui uma loja disponível.',
  LOJA_INVALIDA: 'Você não possui acesso a esta loja.',
  TOKEN_SELECAO_LOJA_INVALIDO: 'A seleção de loja expirou. Entre novamente.'
};

export function LoginPage() {
  const { status, login, storeSelection, selectStore, cancelStoreSelection } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(location.state?.logoutError ?? null);

  if (status === 'authenticated') return <Navigate replace to="/dashboard" />;

  async function handleLogin(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const authenticatedUser = await login(identifier, password);
      if (authenticatedUser) {
        const destination = location.state?.from?.pathname;
        navigate(destination && destination !== '/login' ? destination : '/dashboard', { replace: true });
      }
    } catch (requestError) {
      setError({
        message: authMessages[requestError.code] ?? requestError.message,
        requestId: requestError.requestId
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStoreSelection(event) {
    event.preventDefault();
    if (!selectedStoreId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await selectStore(selectedStoreId);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError({
        message: authMessages[requestError.code] ?? requestError.message,
        requestId: requestError.requestId
      });
      if (requestError.code === 'TOKEN_SELECAO_LOJA_INVALIDO') cancelStoreSelection();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4, bgcolor: 'background.default' }}
    >
      <Container maxWidth="xs">
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <LockOutlinedIcon />
          </Box>
          <Typography component="h1" variant="h1">
            Tomazelli ERP
          </Typography>
          <Typography color="text.secondary">Entre para acessar seu ambiente</Typography>
        </Stack>
        <Card sx={{ borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Stack
              component="form"
              onSubmit={status === 'selecting-store' ? handleStoreSelection : handleLogin}
              spacing={2.5}
            >
              {error && (
                <Alert severity="error" role="alert">
                  {error.message}
                  {error.requestId && (
                    <Typography component="div" variant="caption">
                      Referência: {error.requestId}
                    </Typography>
                  )}
                </Alert>
              )}
              {status === 'selecting-store' ? (
                <>
                  {/* O desafio multiloja permanece somente neste estado React e nunca é incluído na URL ou storage. */}
                  <Box>
                    <Typography component="h2" variant="h5" fontWeight={750}>
                      Selecione uma loja
                    </Typography>
                    <Typography color="text.secondary">Escolha a loja em que deseja trabalhar.</Typography>
                  </Box>
                  <RadioGroup
                    value={selectedStoreId}
                    onChange={(event) => setSelectedStoreId(event.target.value)}
                  >
                    {storeSelection?.stores.map((store) => (
                      <FormControlLabel
                        key={store.id}
                        value={String(store.id)}
                        control={<Radio />}
                        label={store.nome}
                      />
                    ))}
                  </RadioGroup>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      fullWidth
                      disabled={submitting}
                      onClick={() => {
                        setSelectedStoreId('');
                        setPassword('');
                        cancelStoreSelection();
                      }}
                      variant="outlined"
                    >
                      Voltar
                    </Button>
                    <Button
                      fullWidth
                      disabled={!selectedStoreId || submitting}
                      type="submit"
                      variant="contained"
                    >
                      {submitting ? 'Entrando...' : 'Continuar'}
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  <TextField
                    autoComplete="username"
                    autoFocus
                    disabled={submitting}
                    fullWidth
                    label="Usuário ou e-mail"
                    name="username"
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                    type="text"
                    value={identifier}
                  />
                  <TextField
                    autoComplete="current-password"
                    disabled={submitting}
                    fullWidth
                    label="Senha"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                              edge="end"
                              onClick={() => setShowPassword((visible) => !visible)}
                            >
                              {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                  <Button disabled={submitting} fullWidth size="large" type="submit" variant="contained">
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
