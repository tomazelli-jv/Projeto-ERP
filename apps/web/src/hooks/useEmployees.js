import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEmployees, getEmployee, saveEmployee } from '../api/employees.js';
import { employeeScope } from '../api/employees-contract.js';
import { useAuth } from '../app/auth/auth-context.js';
import { employeeAccess } from '../app/auth/permissions.js';

// Chaves incluem sessão e empresa, nunca selectedCompanyId da administração nem loja como filtro.
export function useEmployees(filters, blocked = false) {
  const { claims, status } = useAuth();
  const access = employeeAccess(claims, status);
  const scope = employeeScope(claims);
  const enabled = access.view && Boolean(claims?.empresaId) && !blocked;
  const query = useQuery({
    queryKey: [...scope, 'list', filters],
    queryFn: ({ signal }) => listEmployees(filters, signal),
    enabled,
    // Pequena janela de frescor evita refetch ao reabilitar a mesma empresa após troca de loja.
    staleTime: 30_000,
    retry: false
  });
  return { query, access, enabled, scope };
}

export function useEmployee(id, enabled) {
  const { claims } = useAuth();
  return useQuery({
    queryKey: [...employeeScope(claims), 'detail', id],
    queryFn: ({ signal }) => getEmployee(id, signal),
    enabled: enabled && id != null,
    retry: false
  });
}

export function useSaveEmployee(id) {
  const client = useQueryClient();
  const { claims, status } = useAuth();
  const scope = employeeScope(claims);
  const access = employeeAccess(claims, status);
  return useMutation({
    // Formulário fica somente na closure da chamada; senha não vira variables do MutationCache.
    mutationFn: async (submit) => {
      if (!claims?.empresaId || !access.view || !(id == null ? access.create : access.update))
        throw Object.assign(new Error('Acesso negado.'), { status: 403 });
      return submit((form) => saveEmployee(id, form));
    },
    gcTime: 0,
    onSuccess: async (employee) => {
      client.setQueryData([...scope, 'detail', employee.id], employee);
      await Promise.all([
        client.invalidateQueries({ queryKey: [...scope, 'list'] }),
        client.invalidateQueries({ queryKey: [...scope, 'detail', employee.id] })
      ]);
    }
  });
}
