import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
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
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default'
      }}
    >
      {/* A apresentação compartilha os tokens Light/Dark; autenticação e desafio multiloja são preservados. */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 1480,
          minHeight: { md: 'calc(100vh - 64px)' },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 3fr)' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        <Stack
          component="aside"
          spacing={5}
          sx={{
            p: { xs: 3, md: 4, lg: 6 },
            bgcolor: 'surface.secondary',
            borderRightWidth: { xs: 0, md: 1 },
            borderBottomWidth: { xs: 1, md: 0 },
            borderTopWidth: 0,
            borderLeftWidth: 0,
            borderStyle: 'solid',
            borderColor: 'divider',
            justifyContent: 'space-between'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 26,
                fontWeight: 750
              }}
            >
              T
            </Box>
            <Box>
              <Typography variant="h3">Tomazelli</Typography>
              <Typography variant="body2" color="text.secondary">
                ERP Comercial
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Typography
              component="h1"
              sx={{ fontSize: { xs: 28, lg: 40 }, fontWeight: 750, lineHeight: 1.2, maxWidth: 430 }}
            >
              Gestão clara para o seu negócio.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 3, maxWidth: 430, lineHeight: 1.7 }}>
              Centralize vendas, estoque e financeiro da sua rede de lojas em um único ambiente.
            </Typography>
            <Stack spacing={3} sx={{ mt: 5 }}>
              {[
                [StorefrontOutlinedIcon, 'Controle multi-loja em um único painel'],
                [PersonOutlineIcon, 'Permissões configuráveis por perfil e por loja'],
                [BarChartOutlinedIcon, 'Relatórios financeiros consolidados']
              ].map(([Icon, text]) => (
                <Stack key={text} direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      p: 1.25,
                      display: 'flex',
                      borderRadius: '50%',
                      bgcolor: 'primary.soft',
                      color: 'primary.dark',
                      border: 1,
                      borderColor: 'primary.border'
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography variant="body2">{text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box component="footer">
            <Box sx={{ width: 36, borderTop: 2, borderColor: 'primary.main', mb: 1.5 }} />
            <Typography variant="body2">Tomazelli.Dev</Typography>
            <Typography variant="caption" color="text.secondary">
              ERP Comercial
            </Typography>
          </Box>
        </Stack>
        <Stack sx={{ p: { xs: 3, md: 4, lg: 5 }, gap: 4, justifyContent: 'space-between', minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 32 }}>
            {import.meta.env.DEV && (
              <Chip
                icon={<ScienceOutlinedIcon />}
                label="Ambiente de desenvolvimento"
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
          <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto', py: { xs: 1, md: 3 } }}>
            <Typography variant="overline" color="primary.dark" sx={{ letterSpacing: 3 }}>
              BEM-VINDO DE VOLTA
            </Typography>
            <Typography component="h2" sx={{ fontSize: { xs: 28, lg: 36 }, fontWeight: 750, mt: 1 }}>
              Entrar no sistema
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
              Acesse com suas credenciais corporativas para continuar.
            </Typography>
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
                    <Typography id="store-selection-title" component="h2" variant="h5" fontWeight={750}>
                      Selecione uma loja
                    </Typography>
                    <Typography color="text.secondary">Escolha a loja em que deseja trabalhar.</Typography>
                  </Box>
                  <RadioGroup
                    aria-labelledby="store-selection-title"
                    value={selectedStoreId}
                    onChange={(event) => setSelectedStoreId(event.target.value)}
                    sx={{ gap: 1.25, maxHeight: 320, overflowY: 'auto', p: 0.5 }}
                  >
                    {/* O card inteiro mantém a semântica de radio e a navegação nativa por teclado. */}
                    {storeSelection?.stores.map((store) => (
                      <FormControlLabel
                        key={store.id}
                        value={String(store.id)}
                        control={<Radio />}
                        sx={{
                          m: 0,
                          p: 1.25,
                          minHeight: 72,
                          border: 1,
                          borderRadius: 2,
                          borderColor: selectedStoreId === String(store.id) ? 'primary.main' : 'divider',
                          bgcolor: selectedStoreId === String(store.id) ? 'primary.soft' : 'background.paper',
                          '&:hover': { borderColor: 'primary.main' },
                          '&:focus-within': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2
                          },
                          '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 }
                        }}
                        label={
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box
                              sx={{
                                display: 'flex',
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: 'surface.secondary',
                                color:
                                  selectedStoreId === String(store.id) ? 'primary.dark' : 'text.secondary'
                              }}
                            >
                              <StorefrontOutlinedIcon fontSize="small" />
                            </Box>
                            <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>
                              {store.nome}
                            </Typography>
                          </Stack>
                        }
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
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon />
                          </InputAdornment>
                        )
                      }
                    }}
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
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon />
                          </InputAdornment>
                        ),
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
                  <Button
                    disabled={submitting}
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                  >
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </>
              )}
            </Stack>

            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={1}
              sx={{ mt: 3, color: 'text.secondary' }}
            >
              <ShieldOutlinedIcon fontSize="small" />
              <Typography variant="caption">Conexão segura e criptografada</Typography>
            </Stack>
          </Box>
          <Typography component="footer" variant="caption" color="text.secondary" textAlign="center">
            © 2026 Tomazelli.Dev — Todos os direitos reservados
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
