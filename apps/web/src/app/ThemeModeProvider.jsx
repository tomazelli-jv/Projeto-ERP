import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createErpTheme } from './theme.js';
import { normalizeThemeMode, readThemeMode, THEME_STORAGE_KEY, ThemeModeContext } from './theme-mode.js';

export function ThemeModeProvider({ children }) {
  const [themeMode, setPreference] = useState(readThemeMode);
  // MUI acompanha matchMedia e remove o listener no cleanup, inclusive em StrictMode.
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const resolvedMode = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;
  const theme = useMemo(() => createErpTheme(resolvedMode), [resolvedMode]);
  useEffect(() => {
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);
  const setThemeMode = useCallback((value) => {
    const preference = normalizeThemeMode(value);
    setPreference(preference);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage bloqueado não impede a troca nesta aba.
    }
  }, []);
  useEffect(() => {
    const sync = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreference(readThemeMode());
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggleTheme = useCallback(
    () => setThemeMode(resolvedMode === 'light' ? 'dark' : 'light'),
    [resolvedMode, setThemeMode]
  );
  const value = useMemo(
    () => ({ themeMode, resolvedMode, setThemeMode, toggleTheme }),
    [themeMode, resolvedMode, setThemeMode, toggleTheme]
  );
  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

ThemeModeProvider.propTypes = { children: PropTypes.node.isRequired };
