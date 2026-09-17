import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Avatar,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router';
import { navigationGroups } from '../../app/navigation.js';
import { useAuth } from '../../app/auth/auth-context.js';
import { layout, sidebarTransition } from '../../app/layout-tokens.js';
import { SettingsNavigation } from './SettingsNavigation.jsx';

function Navigation({ collapsed, onNavigate }) {
  const { pathname } = useLocation();
  return (
    <Box
      component="nav"
      aria-label="Navegação principal"
      sx={{ px: 1.5, py: 1, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
    >
      {navigationGroups.map((group, groupIndex) => (
        <Box key={group.label ?? `group-${groupIndex}`} sx={{ mb: 1 }}>
          {groupIndex > 0 && <Divider sx={{ my: 1 }} />}
          {!collapsed && group.label && (
            <Typography
              color="text.secondary"
              sx={{
                px: 1.5,
                pb: 0.75,
                fontSize: 11,
                fontWeight: 750,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}
            >
              {group.label}
            </Typography>
          )}
          <List disablePadding>
            {group.items.map(({ label, path, icon: Icon }) => {
              // Segmento completo mantém subrotas ativas sem confundir caminhos semelhantes.
              const active = pathname === path || pathname.startsWith(`${path}/`);
              return (
                <Tooltip key={path} title={collapsed ? label : ''} placement="right" arrow>
                  <ListItemButton
                    component={NavLink}
                    to={path}
                    onClick={onNavigate}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    selected={active}
                    sx={{
                      borderRadius: 1,
                      color: 'text.secondary',
                      mb: 0.5,
                      height: 44,
                      px: collapsed ? 0 : 1.5,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': { backgroundColor: 'action.hover' },
                      '&.Mui-selected': {
                        color: 'primary.dark',
                        backgroundColor: 'primary.light',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 9,
                          bottom: 9,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: 'primary.dark'
                        },
                        '&:hover': { backgroundColor: 'primary.light' }
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active ? 'primary.dark' : 'text.secondary',
                        minWidth: collapsed ? 0 : 38,
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    {/* Retira labels antes da redução de largura para impedir texto espremido. */}
                    {!collapsed && (
                      <ListItemText
                        primary={label}
                        sx={{ whiteSpace: 'nowrap' }}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>
      ))}
      {/* Configurações usa o mesmo conteúdo no desktop e no Drawer mobile. */}
      <SettingsNavigation collapsed={collapsed} onNavigate={onNavigate} />
    </Box>
  );
}
Navigation.propTypes = { collapsed: PropTypes.bool.isRequired, onNavigate: PropTypes.func.isRequired };

export function Sidebar({ collapsed, compact, mobileOpen, onClose, onToggle, onUserMenu }) {
  const { user } = useAuth();
  // Um conteúdo atende desktop e Drawer: preferência desktop nunca recolhe o mobile.
  const mini = !compact && collapsed;
  const width = mini ? layout.sidebarCollapsedWidth : layout.sidebarExpandedWidth;
  return (
    <Box
      component="aside"
      aria-label="Menu lateral"
      sx={{ flexShrink: 0, width: compact ? 0 : width, ...sidebarTransition }}
    >
      <Drawer
        variant={compact ? 'temporary' : 'permanent'}
        open={compact ? mobileOpen : true}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ...sidebarTransition
          }
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={mini ? 0 : 1.5}
          sx={{
            height: 72,
            flexShrink: 0,
            px: mini ? 0 : 2,
            justifyContent: mini ? 'center' : 'flex-start',
            overflow: 'hidden'
          }}
        >
          <Typography
            aria-label="Tomazelli ERP"
            color="primary.dark"
            fontSize={26}
            fontWeight={800}
            sx={{ width: 36, textAlign: 'center', flexShrink: 0 }}
          >
            T
          </Typography>
          {!mini && (
            <Box sx={{ whiteSpace: 'nowrap' }}>
              <Typography color="primary.dark" fontWeight={800}>
                Tomazelli
              </Typography>
              <Typography color="text.secondary" variant="caption">
                ERP Comercial
              </Typography>
            </Box>
          )}
        </Stack>
        <Box
          sx={{
            display: 'flex',
            justifyContent: mini ? 'center' : 'flex-end',
            px: 1.5,
            pb: 1,
            flexShrink: 0
          }}
        >
          <Tooltip
            title={compact ? 'Fechar navegação' : mini ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            placement="right"
          >
            <IconButton
              aria-label={
                compact ? 'Fechar navegação' : mini ? 'Expandir menu lateral' : 'Recolher menu lateral'
              }
              aria-expanded={compact ? mobileOpen : !mini}
              onClick={compact ? onClose : onToggle}
            >
              {mini ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        <Navigation collapsed={mini} onNavigate={onClose} />
        {/* Rodapé fixo no fluxo flex; só a navegação rola. Usa o menu único do AppShell. */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', p: mini ? 1.5 : 2, flexShrink: 0 }}>
          <Tooltip
            title={mini ? [user?.name, user?.email].filter(Boolean).join(' — ') || 'Minha Conta' : ''}
            placement="right"
          >
            <ListItemButton
              component="button"
              aria-label="Abrir menu da conta"
              aria-haspopup="menu"
              onClick={onUserMenu}
              sx={{
                width: '100%',
                borderRadius: 1,
                p: 0.5,
                minHeight: 44,
                justifyContent: mini ? 'center' : 'flex-start',
                overflow: 'hidden'
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  mr: mini ? 0 : 1.5,
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                  fontSize: 14
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              {!mini && (
                <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                  <Typography noWrap fontWeight={600}>
                    {user?.name || 'Minha Conta'}
                  </Typography>
                  <Typography noWrap variant="caption" color="text.secondary">
                    {user?.email || 'Minha Conta'}
                  </Typography>
                </Box>
              )}
            </ListItemButton>
          </Tooltip>
        </Box>
      </Drawer>
    </Box>
  );
}
Sidebar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  compact: PropTypes.bool.isRequired,
  mobileOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onUserMenu: PropTypes.func.isRequired
};
