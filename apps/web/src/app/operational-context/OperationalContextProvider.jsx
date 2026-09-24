import { useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { switchStore } from '../../api/auth.js';
import { getMyStores } from '../../api/operational-context.js';
import { useAuth } from '../auth/auth-context.js';
import { OperationalContext } from './operational-context.js';

// O contexto operacional Ã© reconstruÃ­do do JWT e dos vÃ­nculos atuais; localStorage deixou de ser fonte de verdade.
export function OperationalContextProvider({ children }) {
  const queryClient = useQueryClient();
  const { status, claims, acceptAccessToken } = useAuth();
  const [isSwitchingStore, setIsSwitchingStore] = useState(false);
  const [switchError, setSwitchError] = useState(null);
  const employeeId = claims?.funcionarioId;
  const companyId = claims?.empresaId;
  const claimedStoreId = claims?.lojaId == null ? null : String(claims.lojaId);
  const query = useQuery({
    queryKey: ['my-stores', employeeId],
    queryFn: getMyStores,
    enabled: status === 'authenticated' && Boolean(employeeId)
  });
  const stores = useMemo(() => query.data ?? [], [query.data]);
  const refetchStores = query.refetch;
  const activeStore = stores.find((store) => store.id === claimedStoreId) ?? null;

  // A UI sÃ³ muda de loja depois de o backend emitir um JWT novo; falhas preservam integralmente o contexto anterior.
  const setActiveStore = useCallback(
    async (storeId) => {
      const numericId = Number(storeId);
      if (
        !Number.isSafeInteger(numericId) ||
        numericId <= 0 ||
        !stores.some((store) => store.id === String(storeId) && store.ativo)
      )
        throw new Error('Loja invÃ¡lida.');
      setIsSwitchingStore(true);
      setSwitchError(null);
      try {
        const result = await switchStore(numericId);
        acceptAccessToken(result);
        // Limpar todo o cache evita exibir por um instante dados obtidos sob o JWT da loja anterior.
        queryClient.clear();
        // O chamador só recarrega a página quando a API confirma o novo contexto.
        return true;
      } catch (error) {
        setSwitchError(error);
        return false;
      } finally {
        setIsSwitchingStore(false);
      }
    },
    [acceptAccessToken, queryClient, stores]
  );

  const retry = useCallback(() => {
    setSwitchError(null);
    return refetchStores();
  }, [refetchStores]);

  const value = useMemo(
    () => ({
      company: companyId == null ? null : { id: String(companyId) },
      employee: employeeId == null ? null : { id: String(employeeId) },
      stores,
      activeStore,
      setActiveStore,
      isSwitchingStore,
      isLoading: Boolean(employeeId) && query.isPending && query.isFetching,
      error:
        switchError ??
        query.error ??
        (claimedStoreId && query.isSuccess && !activeStore
          ? new Error('A loja do token nÃ£o consta mais entre as lojas permitidas.')
          : null),
      hasStores: stores.length > 0,
      retry
    }),
    [
      activeStore,
      claimedStoreId,
      companyId,
      employeeId,
      isSwitchingStore,
      query.error,
      query.isFetching,
      query.isPending,
      query.isSuccess,
      retry,
      setActiveStore,
      stores,
      switchError
    ]
  );

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>;
}

OperationalContextProvider.propTypes = { children: PropTypes.node.isRequired };
