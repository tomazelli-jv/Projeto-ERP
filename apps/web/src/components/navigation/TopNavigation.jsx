import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import PropTypes from 'prop-types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  ClickAwayListener,
  Collapse,
  Drawer,
  Fade,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import { NavigationItems } from './NavigationItems.jsx';
import { topNavigationGroups, isNavigationActive } from '../../app/navigation.js';

const activeStyle = { bgcolor: 'primary.soft', color: 'primary.dark' };

// Um único grupo aberto, com pequena tolerância para atravessar o espaço entre botão e painel.
// Links continuam links nativos; Tab, Enter e Escape funcionam sem exigir navegação por mouse.
export function TopNavigation({ compact, mobileOpen, onClose, onAction }) {
  const { pathname } = useLocation();
  const [opened, setOpened] = useState(null);
  const [mobileGroup, setMobileGroup] = useState(null);
  const timer = useRef(null);
  const triggers = useRef({});
  const panel = useRef(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const cancelClose = () => clearTimeout(timer.current);
  const close = () => {
    cancelClose();
    setOpened(null);
  };
  // Ações de cadastro abrem o mesmo diálogo sem trocar a rota ou desmontar a página atual.
  const select = (item) => {
    close();
    onClose();
    if (item.action) onAction(item.action);
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) setOpened(null);
    }, 220);
  };
  useEffect(() => {
    setOpened(null);
    clearTimeout(timer.current);
  }, [pathname, compact]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!opened) return;
    // Escape também fecha painéis abertos por hover, quando o foco ainda está fora do nav.
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      clearTimeout(timer.current);
      triggers.current[opened]?.focus();
      setOpened(null);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [opened]);

  if (compact)
    return (
      <Drawer
        open={mobileOpen}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: 300, maxWidth: '90vw' } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Typography fontWeight={750}>Tomazelli ERP</Typography>
          <IconButton aria-label="Fechar navegação" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <List component="nav" aria-label="Navegação principal" sx={{ px: 1 }}>
          {topNavigationGroups.map((group) => {
            const active = group.items.some((item) => isNavigationActive(item, pathname));
            const expanded = mobileGroup === group.label;
            return (
              <Box key={group.label}>
                <ListItemButton
                  component={group.path ? NavLink : 'button'}
                  to={group.path}
                  aria-expanded={group.path ? undefined : expanded}
                  onClick={() => (group.path ? onClose() : setMobileGroup(expanded ? null : group.label))}
                  sx={{ width: '100%', borderRadius: 1, ...(active ? activeStyle : {}) }}
                >
                  <ListItemText primary={group.label} />
                  {!group.path && <ExpandMoreIcon />}
                </ListItemButton>
                {!group.path && (
                  <Collapse in={expanded} timeout={reduced ? 0 : 180}>
                    <List disablePadding sx={{ pl: 1 }}>
                      <NavigationItems
                        items={group.items}
                        pathname={pathname}
                        mobile
                        onSelect={select}
                        reduced={reduced}
                      />
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>
      </Drawer>
    );
  return (
    <ClickAwayListener onClickAway={close}>
      <Box
        component="nav"
        aria-label="Navegação principal"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && opened) {
            event.preventDefault();
            const trigger = triggers.current[opened];
            trigger?.focus();
            close();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) close();
        }}
      >
        <Stack direction="row" spacing={0.25}>
          {topNavigationGroups.map((group) => {
            const active = group.items.some((item) => isNavigationActive(item, pathname));
            return (
              <Box key={group.label}>
                <Button
                  ref={(node) => {
                    triggers.current[group.label] = node;
                  }}
                  component={group.path ? NavLink : 'button'}
                  to={group.path}
                  aria-label={group.label}
                  aria-haspopup={group.path ? undefined : 'true'}
                  aria-expanded={group.path ? undefined : opened === group.label}
                  aria-controls={opened === group.label ? 'navigation-panel' : undefined}
                  onMouseEnter={() => {
                    cancelClose();
                    setOpened(group.path ? null : group.label);
                  }}
                  onMouseLeave={scheduleClose}
                  onFocus={() => {
                    cancelClose();
                    setOpened(group.path ? null : group.label);
                  }}
                  onClick={() => {
                    if (!group.path) {
                      cancelClose();
                      setOpened(group.label);
                    } else close();
                  }}
                  startIcon={(() => {
                    const Icon = group.items[0].icon;
                    return <Icon sx={{ fontSize: '18px !important' }} />;
                  })()}
                  endIcon={
                    !group.path && (
                      <ExpandMoreIcon
                        sx={{
                          fontSize: '16px !important',
                          transform: opened === group.label ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: reduced ? 'none' : 'transform 180ms ease'
                        }}
                      />
                    )
                  }
                  sx={{
                    minWidth: 0,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 99,
                    transition: reduced ? 'none' : 'background-color 180ms ease, color 180ms ease',
                    ...(opened === group.label ? { bgcolor: 'action.hover', color: 'text.primary' } : {}),
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    color: 'text.secondary',
                    ...(active ? activeStyle : {}),
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' }
                  }}
                >
                  {group.label}
                </Button>
                {opened === group.label && (
                  <Popper
                    open
                    anchorEl={triggers.current[group.label]}
                    placement="bottom-start"
                    disablePortal
                    transition
                    sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
                    modifiers={[
                      { name: 'offset', options: { offset: [0, 12] } },
                      { name: 'preventOverflow', options: { padding: 12 } }
                    ]}
                  >
                    {({ TransitionProps }) => (
                      <Fade {...TransitionProps} timeout={reduced ? 0 : 180}>
                        <Paper
                          ref={panel}
                          id="navigation-panel"
                          role="region"
                          aria-label={group.label}
                          onMouseEnter={cancelClose}
                          onMouseLeave={scheduleClose}
                          sx={{
                            width: group.label === 'Produtos' ? 300 : group.items.length > 2 ? 580 : 350,
                            maxWidth: 'calc(100vw - 24px)',
                            p: 2.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: 'divider',
                            boxShadow: 1,
                            bgcolor: 'background.paper',
                            animation: reduced ? 'none' : 'navigation-entry 160ms ease-out',
                            '@keyframes navigation-entry': {
                              from: { transform: 'translateY(-4px)' },
                              to: { transform: 'translateY(0)' }
                            }
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {group.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.description}
                          </Typography>
                          <Box
                            sx={{
                              mt: 1.5,
                              display: 'grid',
                              gridTemplateColumns:
                                group.label !== 'Produtos' && group.items.length > 2
                                  ? 'repeat(2,minmax(0,1fr))'
                                  : '1fr',
                              gap: 1
                            }}
                          >
                            <NavigationItems
                              items={group.items}
                              pathname={pathname}
                              onSelect={select}
                              reduced={reduced}
                            />
                          </Box>
                        </Paper>
                      </Fade>
                    )}
                  </Popper>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </ClickAwayListener>
  );
}
TopNavigation.propTypes = {
  compact: PropTypes.bool.isRequired,
  mobileOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired
};
