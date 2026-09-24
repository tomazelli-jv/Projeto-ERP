import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { appRoutes } from '../../app/navigation.js';

// Um submenu de Configurações: inline quando aberto, Menu lateral quando o rail está recolhido.
const items = ['/settings', '/admin/users', '/admin/plan'].map((path) =>
  appRoutes.find((route) => route.path === path)
);
export function SettingsNavigation({ collapsed, onNavigate }) {
  const { pathname } = useLocation();
  const active = items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'));
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const submenuRef = useRef(null);
  const scrollRequested = useRef(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const open = active || expanded;
  // Rola somente a navegação após a expansão, sem deslocar a página ou o cabeçalho.
  function revealSubmenu() {
    if (!scrollRequested.current) return;
    scrollRequested.current = false;
    const list = submenuRef.current;
    const navigation = list?.closest('nav');
    if (!navigation) return;
    const overflow = list.getBoundingClientRect().bottom - navigation.getBoundingClientRect().bottom + 8;
    if (overflow > 0) navigation.scrollBy({ top: overflow, behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  const close = () => {
    setAnchor(null);
    onNavigate();
  };
  return (
    <>
      <Tooltip title={collapsed ? 'Configurações' : ''} placement="right">
        <ListItemButton
          component="button"
          aria-label="Configurações"
          aria-expanded={collapsed ? Boolean(anchor) : open}
          aria-haspopup={collapsed ? 'menu' : undefined}
          onClick={(event) => {
            if (collapsed) return setAnchor(event.currentTarget);
            scrollRequested.current = true;
            if (open) {
              revealSubmenu();
              setExpanded(false);
            } else setExpanded(true);
          }}
          selected={active}
          sx={{
            width: '100%',
            height: 44,
            borderRadius: 1,
            px: collapsed ? 0 : 1.5,
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: active ? 'text.primary' : 'text.secondary',
            '&.Mui-selected': { bgcolor: 'primary.soft' }
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 0 : 38,
              color: active ? 'primary.dark' : 'text.secondary',
              justifyContent: 'center'
            }}
          >
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText primary="Configurações" primaryTypographyProps={{ fontSize: 14 }} />
              {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </>
          )}
        </ListItemButton>
      </Tooltip>
      {!collapsed && (
        <Collapse in={open} timeout={reducedMotion ? 0 : 280} onEntered={revealSubmenu}>
          <List ref={submenuRef} disablePadding sx={{ pl: 2 }}>
            {items.map((item) => (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                onClick={onNavigate}
                selected={pathname === item.path || pathname.startsWith(item.path + '/')}
                sx={{
                  minHeight: 44,
                  borderRadius: 1,
                  '&.Mui-selected': { bgcolor: 'primary.soft', color: 'text.primary' }
                }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      )}
      <Menu
        anchorEl={anchor}
        open={collapsed && Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={close}
            selected={pathname === item.path || pathname.startsWith(item.path + '/')}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
SettingsNavigation.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  onNavigate: PropTypes.func.isRequired
};
