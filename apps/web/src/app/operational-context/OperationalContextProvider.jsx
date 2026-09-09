import { useQuery } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOperationalContext } from '../../api/operational-context.js';
import { configureApiOperationalContext } from '../../api/client.js';
import { useAuth } from '../auth/auth-context.js';
import { OperationalContext } from './operational-context.js';

// Provider valida toda seleção persistida contra a resposta atual antes de expô-la como loja ativa.
export function OperationalContextProvider({ children }) {
  const { status, user } = useAuth();
  const [activeStoreId, setActiveStoreId] = useState(null);
  const activeStoreIdRef = useRef(null);
  const query = useQuery({
    queryKey: ['operational-context', user?.id],
    queryFn: getOperationalContext,
    enabled: status === 'authenticated' && Boolean(user?.id)
  });

  const storageKey = user?.id ? `erp.activeStore.${user.id}` : null;
  // Referência estável evita revalidar localStorage por mudanças de array criadas apenas durante renderização.
  const stores = useMemo(() => query.data?.lojas ?? [], [query.data]);
  const activeStore = stores.find((store) => store.id === activeStoreId && store.ativo) ?? null;

  // Getter por ref permanece atual para apiRequest sem criar dependência circular ou renderização extra.
  useEffect(() => {
    activeStoreIdRef.current = activeStore?.id ?? null;
    configureApiOperationalContext({ getActiveStoreId: () => activeStoreIdRef.current });
  }, [activeStore]);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) {
      setActiveStoreId(null);
      return;
    }
    if (!query.data) return;
    let persisted = null;
    try {
      persisted = localStorage.getItem(storageKey);
    } catch {
      // Navegação continua mesmo quando o browser bloqueia armazenamento local.
    }
    const validPersisted = stores.find((store) => store.id === persisted && store.ativo);
    const activeStores = stores.filter((store) => store.ativo);
    const selected = validPersisted?.id ?? (activeStores.length === 1 ? activeStores[0].id : null);
    setActiveStoreId(selected);
    try {
      if (selected) localStorage.setItem(storageKey, selected);
      else localStorage.removeItem(storageKey);
    } catch {
      // A seleção ainda funciona em memória durante esta sessão.
    }
  }, [query.data, status, storageKey, stores, user?.id]);

  // Troca aceita somente objeto vindo da lista atual e ativo, nunca um UUID arbitrário do componente.
  const setActiveStore = useCallback(
    (storeId) => {
      const selected = stores.find((store) => store.id === storeId && store.ativo) ?? null;
      setActiveStoreId(selected?.id ?? null);
      try {
        if (selected && storageKey) localStorage.setItem(storageKey, selected.id);
        else if (storageKey) localStorage.removeItem(storageKey);
      } catch {
        // Falha de persistência não invalida o contexto em memória.
      }
    },
    [storageKey, stores]
  );

  const value = useMemo(
    () => ({
      company: query.data?.empresa ?? null,
      employee: query.data?.funcionario ?? null,
      stores,
      activeStore,
      setActiveStore,
      isLoading: query.isPending && query.isFetching,
      error: query.error ?? null,
      hasStores: stores.length > 0,
      retry: query.refetch
    }),
    [
      activeStore,
      query.data,
      query.error,
      query.isFetching,
      query.isPending,
      query.refetch,
      setActiveStore,
      stores
    ]
  );

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>;
}

OperationalContextProvider.propTypes = { children: PropTypes.node.isRequired };
