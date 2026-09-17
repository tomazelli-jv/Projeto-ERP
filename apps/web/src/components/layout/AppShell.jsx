import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ComputerIcon from '@mui/icons-material/Computer';
import { useThemeMode } from '../../app/theme-mode.js';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
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
import { Sidebar } from '../navigation/Sidebar.jsx';

import { layout } from '../../app/layout-tokens.js';
import { useSidebarPreference } from '../../app/useSidebarPreference.js';

export function AppShell() {
  const theme = useTheme();
  const { themeMode, resolvedMode, setThemeMode, toggleTheme } = useThemeMode();
  const compact = useMediaQuery(theme.breakpoints.down(layout.desktopBreakpoint));
  const { collapsed, toggleCollapsed } = useSidebarPreference();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const {
    company,
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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        collapsed={collapsed}
        compact={compact}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={toggleCollapsed}
        onUserMenu={(event) => setUserMenuAnchor(event.currentTarget)}
      />
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
          <Toolbar sx={{ minHeight: { xs: layout.headerHeight }, gap: { xs: 1, sm: 2 } }}>
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
              sx={{ minWidth: 0, width: '100%' }}
            >
              <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle1" fontWeight={750} noWrap>
                  {company?.nome ?? 'Tomazelli ERP'}
                </Typography>
                {import.meta.env.DEV && !compact && (
                  <Typography variant="caption" color="text.secondary">
                    Gestão clara para o seu negócio
                  </Typography>
                )}
              </Box>
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }}>
                {/* Seletor global mostra a empresa derivada do backend e nunca aceita lojas fora da lista atual. */}
                {contextLoading ? (
                  <Stack alignItems="center" direction="row" spacing={1} role="status">
                    <CircularProgress size={20} />
                    {!compact && <Typography variant="caption">Carregando lojas...</Typography>}
                  </Stack>
                ) : contextError ? (
                  <Button color="error" size="small" onClick={() => retry()}>
                    {contextError.code === 'BUSINESS_CONTEXT_REQUIRED'
                      ? 'Empresa não vinculada'
                      : 'Recarregar contexto'}
                  </Button>
                ) : (
                  <FormControl
                    size="small"
                    sx={{ minWidth: { xs: 150, sm: 210 }, maxWidth: { xs: 180, md: 280 } }}
                  >
                    <InputLabel id="active-store-label" shrink>
                      Loja
                    </InputLabel>
                    <Select
                      disabled={isSwitchingStore}
                      labelId="active-store-label"
                      label="Loja"
                      value={activeStore?.id ?? ''}
                      onChange={(event) => setActiveStore(event.target.value)}
                      displayEmpty
                      renderValue={(value) => {
                        const selected = stores.find((store) => store.id === value);
                        return isSwitchingStore
                          ? 'Trocando loja...'
                          : (selected?.nomeFantasia ??
                              (stores.some((store) => store.ativo)
                                ? 'Selecionar loja'
                                : 'Nenhuma loja disponível'));
                      }}
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.id} value={store.id} disabled={!store.ativo}>
                          <Stack>
                            <Typography variant="body2">
                              {store.nomeFantasia}
                              {store.ativo ? '' : ' — Inativa'}
                            </Typography>
                            {(store.cidade || store.uf) && (
                              <Typography color="text.secondary" variant="caption">
                                {[store.cidade, store.uf].filter(Boolean).join(' / ')}
                              </Typography>
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {!compact && (
                  <Chip label="Ambiente de desenvolvimento" color="warning" size="small" variant="outlined" />
                )}
                <Tooltip title={resolvedMode === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}>
                  <IconButton
                    aria-label={
                      resolvedMode === 'light' ? 'Alterar para tema escuro' : 'Alterar para tema claro'
                    }
                    onClick={toggleTheme}
                  >
                    {resolvedMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                  </IconButton>
                </Tooltip>
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
                    <Typography noWrap sx={{ maxWidth: 180 }} variant="body2">
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
                </Menu>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ minWidth: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 2.5, lg: 3 } }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
