import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import {
  Box,
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

function Navigation({ onNavigate }) {
  const location = useLocation();
  return (
    <Box component="nav" aria-label="Navegação principal" sx={{ px: 1.5, py: 2 }}>
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
                    borderRadius: 2,
                    mb: 0.5,
                    minHeight: 42,
                    '&.Mui-selected': { color: 'primary.dark', backgroundColor: 'primary.light' }
                  }}
                >
                  <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary', minWidth: 38 }}>
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
