import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
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
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router';
import { navigationGroups } from '../../app/navigation.js';
import { useAuth } from '../../app/auth/auth-context.js';

function Navigation({ onNavigate }) {
  const location = useLocation();
  return (
    <Box component="nav" aria-label="Navegação principal" sx={{ px: 1.5, py: 2, flex: 1, overflowY: 'auto' }}>
      {navigationGroups.map((group, groupIndex) => (
        <Box
          key={group.label ?? `group-${groupIndex}`}
          sx={{ mb: groupIndex === navigationGroups.length - 1 ? 0 : 2 }}
        >
          {group.label && (
            <Typography
              color="text.secondary"
              sx={{
                px: 1.5,
                pb: 0.75,
                fontSize: 11,
                fontWeight: 750,
                letterSpacing: '.08em',
                textTransform: 'uppercase'
              }}
            >
              {group.label}
            </Typography>
          )}
          <List disablePadding>
            {group.items.map(({ label, path, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <ListItemButton
                  component={NavLink}
                  key={path}
                  onClick={onNavigate}
                  selected={active}
                  to={path}
                  sx={{
                    borderRadius: 1,
                    color: 'text.secondary',
                    mb: 0.5,
                    minHeight: 40,
                    py: 0.5,
                    position: 'relative',
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
                  <ListItemIcon sx={{ color: active ? 'primary.dark' : 'text.secondary', minWidth: 38 }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
          {groupIndex === 0 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}
    </Box>
  );
}

Navigation.propTypes = { onNavigate: PropTypes.func.isRequired };

export function Sidebar({ drawerWidth, mobileOpen, onClose }) {
  // Rodapé lê somente identidade real; não infere role pelo nome ADM.
  const { user } = useAuth();
  const content = (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ minHeight: 72, px: 2.5 }}
      >
        <Box>
          <Typography color="primary.dark" fontWeight={800}>
            Tomazelli
          </Typography>
          <Typography color="text.secondary" variant="caption">
            ERP Comercial
          </Typography>
        </Box>
        <IconButton aria-label="Fechar navegação" onClick={onClose} sx={{ display: { md: 'none' } }}>
          <KeyboardDoubleArrowLeftIcon />
        </IconButton>
      </Stack>
      <Divider />
      <Navigation onNavigate={onClose} />
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
        <ListItemButton component={NavLink} to="/account" onClick={onClose} sx={{ borderRadius: 1, p: 0.5 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              mr: 1.5,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontSize: 14
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={600}>
              {user?.name || 'Minha Conta'}
            </Typography>
            <Typography noWrap variant="caption" color="text.secondary">
              {user?.email || 'Minha Conta'}
            </Typography>
          </Box>
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box component="aside" sx={{ flexShrink: { md: 0 }, width: { md: drawerWidth } }}>
      <Drawer
        open={mobileOpen}
        onClose={onClose}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        {content}
      </Drawer>
      <Drawer
        open
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' }
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}

Sidebar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
  mobileOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
