import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Chip, IconButton, Stack, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../navigation/Sidebar.jsx';

const drawerWidth = 264;

export function AppShell() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Chip label="Ambiente de desenvolvimento" color="warning" size="small" variant="outlined" />
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
