import MenuIcon from '@mui/icons-material/Menu';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../app/auth/auth-context.js';
import { Sidebar } from '../navigation/Sidebar.jsx';

const drawerWidth = 264;

export function AppShell() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="fixed"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` }
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
          <IconButton
            aria-label="Abrir navegação"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ minWidth: 0, width: '100%' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={750} noWrap>
                Tomazelli ERP
              </Typography>
              {!compact && (
                <Typography variant="caption" color="text.secondary">
                  Gestão clara para o seu negócio
                </Typography>
              )}
            </Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {!compact && (
                <Chip label="Ambiente de desenvolvimento" color="warning" size="small" variant="outlined" />
              )}
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
                sx={{ minWidth: 0 }}
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
                <MenuItem disabled={loggingOut} onClick={handleLogout}>
                  <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {loggingOut ? 'Saindo...' : 'Sair'}
                </MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      <Sidebar drawerWidth={drawerWidth} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: { xs: '64px', md: '72px' } }}>
        <Box sx={{ mx: 'auto', maxWidth: 1440, p: { xs: 2, sm: 3, lg: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
