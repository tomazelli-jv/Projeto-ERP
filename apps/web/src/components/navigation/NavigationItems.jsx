import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Collapse, ListItemButton, ListItemIcon, ListItemText, Paper } from '@mui/material';

import { isNavigationActive } from '../../app/navigation.js';

// Um segundo nível por lista; no desktop o padding forma uma ponte contínua para o mouse.
export function NavigationItems({ items, pathname, mobile = false, onSelect, reduced }) {
  const [expanded, setExpanded] = useState(null);
  const id = useId();
  return items.map((item, index) => {
    const active = isNavigationActive(item, pathname);
    const open = expanded === item.label;
    const childrenId = `${id}-${index}`;
    return (
      <Box
        key={item.path ?? item.label}
        sx={{ position: 'relative' }}
        onMouseEnter={() => !mobile && setExpanded(item.children ? item.label : null)}
        onMouseLeave={() => !mobile && setExpanded(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setExpanded(null);
            event.currentTarget.querySelector('button')?.focus();
          }
        }}
      >
        <ListItemButton
          component={item.path ? NavLink : 'button'}
          to={item.path}
          disabled={item.disabled}
          aria-haspopup={item.children && !mobile ? 'true' : undefined}
          aria-expanded={item.children ? open : undefined}
          aria-controls={item.children ? childrenId : undefined}
          onClick={() => (item.children ? setExpanded(mobile && open ? null : item.label) : onSelect(item))}
          sx={{
            width: '100%',
            borderRadius: 1,
            gap: 1,
            alignItems: 'center',
            ...(active ? { bgcolor: 'primary.soft', color: 'primary.dark' } : {}),
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' }
          }}
        >
          <ListItemIcon sx={{ minWidth: 30, color: 'primary.dark' }}>
            <item.icon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            secondary={item.description}
            primaryTypographyProps={{ fontSize: 13, fontWeight: 650 }}
            secondaryTypographyProps={{ fontSize: 12 }}
          />
          {item.children && (
            <ChevronRightIcon sx={{ transform: mobile && open ? 'rotate(90deg)' : 'none' }} />
          )}
        </ListItemButton>
        {item.children &&
          (mobile ? (
            <Collapse in={open} timeout={reduced ? 0 : 160} unmountOnExit id={childrenId}>
              <Box sx={{ pl: 2 }}>
                <NavigationItems
                  items={item.children}
                  pathname={pathname}
                  mobile
                  onSelect={onSelect}
                  reduced={reduced}
                />
              </Box>
            </Collapse>
          ) : (
            open && (
              <Box
                id={childrenId}
                role="region"
                aria-label="Cadastros de produtos"
                sx={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  pl: 1,
                  width: 285,
                  zIndex: 1,
                  animation: reduced ? 'none' : 'submenu-entry 160ms ease-out',
                  '@keyframes submenu-entry': {
                    from: { opacity: 0, transform: 'translateX(-4px)' },
                    to: { opacity: 1, transform: 'translateX(0)' }
                  }
                }}
              >
                <Paper
                  sx={{
                    p: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    borderRadius: 1.5
                  }}
                >
                  <NavigationItems
                    items={item.children}
                    pathname={pathname}
                    onSelect={onSelect}
                    reduced={reduced}
                  />
                </Paper>
              </Box>
            )
          ))}
      </Box>
    );
  });
}
NavigationItems.propTypes = {
  items: PropTypes.array.isRequired,
  pathname: PropTypes.string.isRequired,
  mobile: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  reduced: PropTypes.bool.isRequired
};
