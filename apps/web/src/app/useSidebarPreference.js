import { useState } from 'react';

export const SIDEBAR_STORAGE_KEY = 'erp.sidebarCollapsed';

// Valor inválido ou storage indisponível mantém o padrão expandido, sem afetar sessão/loja.
export function readSidebarPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSidebarPreference() {
  const [collapsed, setPreference] = useState(readSidebarPreference);
  // AppShell compartilha este setter com Parametrização, mantendo uma única preferência.
  function setCollapsed(next) {
    setPreference(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // A troca continua em memória quando o navegador bloqueia persistência.
    }
  }
  return { collapsed, setCollapsed, toggleCollapsed: () => setCollapsed(!collapsed) };
}
