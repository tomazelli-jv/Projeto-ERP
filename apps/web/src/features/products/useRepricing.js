import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntitySource } from '../parties/entity-queries.js';

// Compartilha exatamente o escopo do catálogo; invalida listas e detalhes afetados, não outros módulos.
export function useRepricingMutation() {
  const { repository, scope, enabled } = useEntitySource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes) => {
      if (!enabled) throw Error('Remarcação disponível apenas na demonstração local.');
      return repository.updatePrices(changes);
    },
    onSuccess: async (records) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [...scope, 'list'] }),
        ...records.map((record) => client.invalidateQueries({ queryKey: [...scope, 'detail', record.id] }))
      ]);
    }
  });
}
