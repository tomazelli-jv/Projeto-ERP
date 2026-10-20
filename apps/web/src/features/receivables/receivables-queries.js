import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/auth/auth-context.js';
import { useEntitySource } from '../parties/entity-queries.js';
import { createMockReceivablesRepository } from './mockReceivablesRepository.js';
import { paymentMethodsRepository } from './paymentMethodsRepository.js';

// Clientes mantém a fonte/cache oficial do módulo. Financeiro acrescenta loja ao escopo DEV.
export const receivablesKeys = {
  all: (scope) => ['receivables', scope],
  list: (scope, filters) => ['receivables', scope, 'list', filters],
  summary: (scope, filters) => ['receivables', scope, 'summary', filters],
  detail: (scope, id) => ['receivables', scope, 'detail', id],
  methods: (scope) => ['receivables', scope, 'methods']
};
export function useReceivablesSource() {
  const { claims } = useAuth();
  const customers = useEntitySource();
  const scope = JSON.stringify([claims?.sub ?? '', claims?.empresaId ?? '', claims?.lojaId ?? '']);
  const repository = useMemo(
    () =>
      createMockReceivablesRepository({
        key: `erp.dev.receivables.v1:${scope}`,
        customers: customers.repository,
        storage: {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value)
        },
        lock: (name, operation) => (navigator.locks ? navigator.locks.request(name, operation) : operation())
      }),
    [scope, customers.repository]
  );
  return { repository, scope, enabled: customers.enabled };
}
export function useReceivableCustomers() {
  // Reutiliza inclusive a paginação real de Clientes: nenhum limite silencioso no seletor.
  const source = useEntitySource();

  return useQuery({
    queryKey: [...source.scope, 'list', 'receivable-options'],
    enabled: source.enabled,
    queryFn: async () => {
      const first = await source.repository.list({ page: 1, pageSize: 100 });
      const rows = [...first.items];
      for (let page = 2; rows.length < first.total; page++) {
        const next = await source.repository.list({ page, pageSize: 100 });
        if (!next.items.length) break;
        rows.push(...next.items);
      }
      return rows;
    },
    retry: false
  });
}
export function useReceivables(filters) {
  const s = useReceivablesSource();
  return useQuery({
    queryKey: receivablesKeys.list(s.scope, filters),
    queryFn: () => s.repository.list(filters),
    enabled: s.enabled,
    retry: false,
    refetchInterval: 60000
  });
}
export function useReceivableSummary(filters) {
  const s = useReceivablesSource();
  return useQuery({
    queryKey: receivablesKeys.summary(s.scope, filters),
    queryFn: () => s.repository.getSummary(filters),
    enabled: s.enabled,
    retry: false,
    refetchInterval: 60000
  });
}
export function useReceivable(id) {
  const s = useReceivablesSource();
  return useQuery({
    queryKey: receivablesKeys.detail(s.scope, id),
    queryFn: () => s.repository.getById(id),
    enabled: s.enabled && Boolean(id),
    retry: false
  });
}
export function usePaymentMethods() {
  const s = useReceivablesSource();
  return useQuery({
    queryKey: receivablesKeys.methods(s.scope),
    queryFn: paymentMethodsRepository.list,
    enabled: s.enabled,
    retry: false
  });
}
export function useReceivableMutation() {
  const s = useReceivablesSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ operation, id, data }) => {
      if (!s.enabled) throw Error('Demonstração disponível somente em Development.');
      return operation === 'create'
        ? s.repository.createInstallments(data)
        : s.repository[operation](id, data);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: receivablesKeys.all(s.scope) })
  });
}
