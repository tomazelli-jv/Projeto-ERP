import { createContext, useContext } from 'react';

export const THEME_STORAGE_KEY = 'erp.themeMode';
export const ThemeModeContext = createContext(null);
export const normalizeThemeMode = (value) => (['light', 'dark', 'system'].includes(value) ? value : 'system');

export function readThemeMode() {
  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode requer ThemeModeProvider');
  return context;
}
