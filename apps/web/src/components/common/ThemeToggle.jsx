import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Box, ButtonBase, Tooltip } from '@mui/material';
import { useThemeMode } from '../../app/theme-mode.js';

// Usa o tema resolvido para manter o seletor sincronizado com a preferência Sistema.
export function ThemeToggle() {
  const { resolvedMode, toggleTheme } = useThemeMode();
  const dark = resolvedMode === 'dark';

  return (
    <Tooltip title={dark ? 'Usar tema claro' : 'Usar tema escuro'}>
      <ButtonBase
        type="button"
        role="switch"
        aria-label="Tema escuro"
        aria-checked={dark}
        onClick={toggleTheme}
        sx={{
          position: 'relative',
          width: 64,
          height: 32,
          flexShrink: 0,
          borderRadius: '999px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mx: 0.5,
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 3
          },
          '& .theme-thumb, & .theme-symbol': {
            transition: 'transform 360ms ease, color 360ms ease, background-color 360ms ease'
          },
          '@media (prefers-reduced-motion: reduce)': {
            '& .theme-thumb, & .theme-symbol': { transition: 'none' }
          }
        }}
      >
        <Box
          className="theme-thumb"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: 3,
            top: 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: 'action.selected',
            transform: dark ? 'translateX(0)' : 'translateX(32px)'
          }}
        />
        <DarkModeOutlinedIcon
          className="theme-symbol"
          sx={{
            position: 'absolute',
            left: 7,
            fontSize: 16,
            color: dark ? 'text.primary' : 'text.secondary',
            transform: dark ? 'rotate(-12deg)' : 'rotate(0deg)'
          }}
        />
        <LightModeOutlinedIcon
          className="theme-symbol"
          sx={{
            position: 'absolute',
            right: 7,
            fontSize: 16,
            color: dark ? 'text.secondary' : 'text.primary',
            transform: dark ? 'rotate(-45deg)' : 'rotate(0deg)'
          }}
        />
      </ButtonBase>
    </Tooltip>
  );
}
