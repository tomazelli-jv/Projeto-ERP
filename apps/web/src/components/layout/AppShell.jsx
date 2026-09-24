import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ComputerIcon from '@mui/icons-material/Computer';
import { useThemeMode } from '../../app/theme-mode.js';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import {
  AppBar,
  Alert,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Radio,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../app/auth/auth-context.js';
import { useOperationalContext } from '../../app/operational-context/operational-context.js';
import { TopNavigation } from '../navigation/TopNavigation.jsx';

import { layout } from '../../app/layout-tokens.js';
import { useSidebarPreference } from '../../app/useSidebarPreference.js';

export function AppShell() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const compact = useMediaQuery(theme.breakpoints.down(layout.desktopBreakpoint));
  const { collapsed, setCollapsed } = useSidebarPreference();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeField, setStoreField] = useState('name');
  const [storeMatch, setStoreMatch] = useState('contains');
  const [chosenStore, setChosenStore] = useState('');
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const {
    stores,
    activeStore,
    setActiveStore,
    isSwitchingStore,
    isLoading: contextLoading,
    error: contextError,
    retry
  } = useOperationalContext();
  const navigate = useNavigate();
  // Navegação fecha somente o Drawer temporário; a preferência desktop permanece independente.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, compact]);

  async function handleLogout() {
    setLoggingOut(true);
    setUserMenuAnchor(null);
    let logoutError = null;
    try {
      await logout();
    } catch (requestError) {
      logoutError = {
        message: 'A sessão foi encerrada neste dispositivo, mas o servidor não confirmou a operação.',
        requestId: requestError.requestId
      };
    } finally {
      navigate('/login', { replace: true, state: logoutError ? { logoutError } : null });
    }
  }

  function handleAccount() {
    setUserMenuAnchor(null);
    // Também fecha quando Minha Conta já é a rota atual (sem evento de mudança de pathname).
    setMobileOpen(false);
    navigate('/account');
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* O menu da conta abre o seletor oficial; a troca continua passando pelo contexto/JWT existente. */}
      <Dialog
        open={storeDialogOpen}
        onClose={() => !isSwitchingStore && setStoreDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="switch-store-title"
      >
        <DialogTitle id="switch-store-title">Consulta de lojas</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione a loja em que deseja trabalhar.
          </Typography>
          {/* Pesquisa local somente nos vínculos retornados pela API; selecionar não troca a sessão. */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Pesquisar por"
              value={storeField}
              onChange={(e) => setStoreField(e.target.value)}
            >
              <MenuItem value="name">Nome</MenuItem>
              <MenuItem value="code">Código</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label="Correspondência"
              value={storeMatch}
              onChange={(e) => setStoreMatch(e.target.value)}
            >
              <MenuItem value="contains">Contém</MenuItem>
              <MenuItem value="starts">Inicia com</MenuItem>
              <MenuItem value="exact">Igual a</MenuItem>
            </TextField>
          </Stack>
          <TextField
            fullWidth
            label="Dados a pesquisar"
            value={storeSearch}
            onChange={(e) => setStoreSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
          {contextError && (
            <Alert
              severity="error"
              action={<Button onClick={() => retry()}>Tentar novamente</Button>}
              sx={{ mb: 2 }}
            >
              Não foi possível carregar ou trocar a loja. Tente novamente.
            </Alert>
          )}
          {contextLoading ? (
            <Stack role="status" direction="row" spacing={1}>
              <CircularProgress size={20} />
              <Typography>Carregando lojas...</Typography>
            </Stack>
          ) : (
            <TableContainer
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, minHeight: 220, maxHeight: 360 }}
            >
              <Table size="small" stickyHeader aria-label="Lojas disponíveis para troca">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Código</TableCell>
                    <TableCell>Nome</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stores
                    .filter((store) => {
                      const value = String(
                        storeField === 'code' ? store.id : store.nomeFantasia
                      ).toLocaleLowerCase('pt-BR');
                      const term = storeSearch.trim().toLocaleLowerCase('pt-BR');
                      return (
                        !term ||
                        (storeMatch === 'starts'
                          ? value.startsWith(term)
                          : storeMatch === 'exact'
                            ? value === term
                            : value.includes(term))
                      );
                    })
                    .map((store) => (
                      <TableRow
                        key={store.id}
                        hover
                        selected={chosenStore === store.id}
                        onClick={() => !isSwitchingStore && store.ativo && setChosenStore(store.id)}
                        sx={{ cursor: store.ativo ? 'pointer' : 'default', opacity: store.ativo ? 1 : 0.6 }}
                      >
                        <TableCell padding="checkbox">
                          <Radio
                            size="small"
                            name="store-choice"
                            checked={chosenStore === store.id}
                            disabled={!store.ativo || isSwitchingStore}
                            onChange={() => setChosenStore(store.id)}
                            inputProps={{ 'aria-label': 'Selecionar ' + store.nomeFantasia }}
                          />
                        </TableCell>
                        <TableCell>{store.id}</TableCell>
                        <TableCell sx={{ overflowWrap: 'anywhere' }}>
                          {store.nomeFantasia}
                          {store.id === activeStore?.id ? ' — Atual' : ''}
                          {!store.ativo ? ' — Inativa' : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {stores.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                  Nenhuma loja disponível.
                </Typography>
              )}
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={isSwitchingStore} onClick={() => setStoreDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={
              isSwitchingStore ||
              contextLoading ||
              !stores.some((store) => store.id === chosenStore && store.ativo)
            }
            onClick={async () => {
              if (chosenStore === activeStore?.id) setStoreDialogOpen(false);
              else if (await setActiveStore(chosenStore)) {
                // Restauração usa o cookie HttpOnly existente; nenhum token é persistido no navegador.
                window.location.reload();
              }
            }}
          >
            {isSwitchingStore ? 'Trocando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* A coluna flex ocupa todo o restante; header e páginas crescem juntos sem offsets fixos. */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          color="inherit"
          elevation={0}
          position="sticky"
          sx={{
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Toolbar sx={{ minHeight: { xs: layout.headerHeight }, gap: 1, px: { xs: 2, lg: 2 } }}>
            <IconButton
              aria-label="Abrir navegação"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: compact ? 'inline-flex' : 'none' }}
            >
              <MenuIcon />
            </IconButton>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ minWidth: 0, width: '100%', gap: 1 }}
            >
              <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle1" fontWeight={750} noWrap>
                  Tomazelli ERP
                </Typography>
                {!compact && (
                  <Typography variant="caption" color="text.secondary">
                    Gestão clara para o seu negócio
                  </Typography>
                )}
              </Box>
              <TopNavigation compact={compact} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                {!compact && (
                  <Tooltip title={activeStore?.nomeFantasia ?? 'Trocar de loja'}>
                    <Button
                      aria-label="Trocar de loja"
                      startIcon={<StorefrontOutlinedIcon fontSize="small" />}
                      color="inherit"
                      onClick={() => {
                        setChosenStore(activeStore?.id ?? '');
                        setStoreSearch('');
                        setStoreDialogOpen(true);
                      }}
                      sx={{ minWidth: 0, maxWidth: 130, fontSize: 12 }}
                    >
                      <Typography variant="caption" noWrap>
                        {activeStore?.nomeFantasia ?? 'Loja'}
                      </Typography>
                    </Button>
                  </Tooltip>
                )}
                {import.meta.env.DEV && !compact && (
                  <Chip
                    label="DEV"
                    aria-label="Ambiente de desenvolvimento"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
                <ThemeToggle />
                <Button
                  aria-controls={userMenuAnchor ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={userMenuAnchor ? 'true' : undefined}
                  color="inherit"
                  onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                  startIcon={
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  sx={{ minWidth: 0, px: { xs: 0.75, md: 1.25 }, borderRadius: 2 }}
                >
                  {!compact && (
                    <Typography noWrap sx={{ maxWidth: 80 }} variant="body2">
                      {user?.name}
                    </Typography>
                  )}
                </Button>
                <Menu
                  id="user-menu"
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={() => setUserMenuAnchor(null)}
                >
                  <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
                    <Typography fontWeight={700} noWrap>
                      {user?.name}
                    </Typography>
                    <Typography color="text.secondary" noWrap variant="caption">
                      {user?.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleAccount} sx={{ mx: 1, borderRadius: 1.5 }}>
                    <ManageAccountsOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Minha Conta
                  </MenuItem>
                  <Divider />
                  <Typography
                    component="li"
                    role="presentation"
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, py: 1 }}
                  >
                    Aparência
                  </Typography>
                  {[
                    ['light', 'Claro', LightModeIcon],
                    ['dark', 'Escuro', DarkModeIcon],
                    ['system', 'Sistema', ComputerIcon]
                  ].map(([mode, label, Icon]) => (
                    <MenuItem
                      key={mode}
                      role="menuitemradio"
                      aria-checked={themeMode === mode}
                      selected={themeMode === mode}
                      onClick={() => setThemeMode(mode)}
                      sx={{ mx: 1, borderRadius: 1.5 }}
                    >
                      <Icon fontSize="small" sx={{ mr: 1.5 }} />
                      {label}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem disabled={loggingOut} onClick={handleLogout} sx={{ mx: 1, borderRadius: 1.5 }}>
                    <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {loggingOut ? 'Saindo...' : 'Sair'}
                  </MenuItem>
                  <MenuItem
                    disabled={loggingOut}
                    onClick={() => {
                      setUserMenuAnchor(null);
                      setMobileOpen(false);
                      setChosenStore(activeStore?.id ?? '');
                      setStoreSearch('');
                      setStoreDialogOpen(true);
                    }}
                    sx={{ mx: 1, borderRadius: 1.5 }}
                  >
                    <StorefrontOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Trocar de loja
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ minWidth: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 2.5, lg: 3 } }}>
            {/* Compartilha a preferência desktop; o Drawer mantém seu estado independente. */}
            <Outlet context={{ collapsed, setCollapsed, topNavigation: true }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
