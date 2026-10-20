import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/auth/auth-context.js';

// Única seleção de fonte, restrita a DEV. Mesmo escopo de identidade/empresa usado pelo catálogo.
export function useLookupSource(module) {
  const { claims } = useAuth();
  const owner = JSON.stringify([claims?.sub ?? '', claims?.empresaId ?? '']);
  const repository = useMemo(
    () =>
      module.repository({
        key: `erp.dev.${module.key}.v1:${owner}`,
        storage: {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value)
        }
      }),
    [owner, module]
  );
  return { repository, owner, enabled: import.meta.env.DEV && Boolean(claims?.sub) };
}
export function useLookupList(module, filters = {}) {
  const { repository, owner, enabled } = useLookupSource(module);
  return useQuery({
    queryKey: [module.key, owner, filters],
    queryFn: () => repository.list(filters),
    enabled,
    retry: false
  });
}
export function useLookupMutation(module) {
  const { repository, owner, enabled } = useLookupSource(module);
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ operation, id, data, active }) => {
      if (!enabled) throw Error(module.unavailable);
      return operation === 'create'
        ? repository.create(data)
        : operation === 'update'
          ? repository.update(id, data)
          : repository.setActive(id, active);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: [module.key, owner] })
  });
}
