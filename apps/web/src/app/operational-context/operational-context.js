import { createContext, useContext } from 'react';

// Context separado impede misturar estado remoto de negócio com credenciais mantidas pelo AuthProvider.
export const OperationalContext = createContext(null);

export function useOperationalContext() {
  const value = useContext(OperationalContext);
  if (!value) throw new Error('useOperationalContext must be used within OperationalContextProvider');
  return value;
}
