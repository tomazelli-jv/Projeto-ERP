import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/auth/auth-context.js';
import { createMockCustomersRepository } from './mockCustomersRepository.js';

// Único ponto de seleção da fonte. Na integração futura, substituir a fábrica por customersApiRepository.
// Mock fica restrito a Development e isolado por identidade/empresa; não representa permissões do backend.
export function useCustomersSource() {
  const { claims } = useAuth();
  const owner = JSON.stringify([claims?.sub ?? '', claims?.empresaId ?? '']);
  const repository = useMemo(
    () =>
      createMockCustomersRepository({
        key: `erp.dev.customers.v1:${owner}`,
        storage: {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value)
        }
      }),
    [owner]
  );
  return { repository, scope: ['customers', owner], enabled: import.meta.env.DEV && Boolean(claims?.sub) };
}
export function useCustomerList(filters) {
  const { repository, scope, enabled } = useCustomersSource();
  return useQuery({
    queryKey: [...scope, 'list', filters],
    queryFn: () => repository.list(filters),
    enabled,
    retry: false
  });
}
export function useCustomerSummary() {
  const { repository, scope, enabled } = useCustomersSource();
  return useQuery({
    queryKey: [...scope, 'summary'],
    queryFn: () => repository.summary(),
    enabled,
    retry: false
  });
}
export function useCustomerDetail(id) {
  const { repository, scope, enabled } = useCustomersSource();
  return useQuery({
    queryKey: [...scope, 'detail', id],
    queryFn: () => repository.getById(id),
    enabled: enabled && Boolean(id),
    retry: false
  });
}
export function useCustomerMutation() {
  const { repository, scope } = useCustomersSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ operation, id, data, active }) =>
      operation === 'create'
        ? repository.create(data)
        : operation === 'update'
          ? repository.update(id, data)
          : repository.setActive(id, active),
    onSuccess: async (record) => {
      client.setQueryData([...scope, 'detail', record.id], record);
      await Promise.all([
        client.invalidateQueries({ queryKey: [...scope, 'list'] }),
        client.invalidateQueries({ queryKey: [...scope, 'summary'] })
      ]);
    }
  });
}
