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
  const [collapsed, setCollapsed] = useState(readSidebarPreference);
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // A troca continua em memória quando o navegador bloqueia persistência.
    }
  }
  return { collapsed, toggleCollapsed };
}
