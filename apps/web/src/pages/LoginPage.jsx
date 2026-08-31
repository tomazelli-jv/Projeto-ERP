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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../app/auth/auth-context.js';

export function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(location.state?.logoutError ?? null);

  if (status === 'authenticated') return <Navigate replace to="/dashboard" />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const destination = location.state?.from?.pathname;
      navigate(destination && destination !== '/login' ? destination : '/dashboard', { replace: true });
    } catch (requestError) {
      const invalid = ['AUTHENTICATION_INVALID', 'INVALID_CREDENTIALS'].includes(requestError.code);
      setError({
        message: invalid ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Tente novamente.',
        requestId: requestError.requestId
      });
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
            <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
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
              <TextField
                autoComplete="email"
                autoFocus
                disabled={submitting}
                fullWidth
                label="E-mail"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
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
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
