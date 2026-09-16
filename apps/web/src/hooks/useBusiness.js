import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmpresa,
  createLoja,
  getEmpresa,
  listEmpresas,
  listLojas,
  updateEmpresa,
  updateLoja
} from '../api/business.js';
import { useAuth } from '../app/auth/auth-context.js';
import { isAdministrator } from '../app/auth/roles.js';

// Claims reais autorizam a interface; nome ADM nunca concede acesso.
export function useBusinessAccess() {
  const { claims, status } = useAuth();
  return { empresaId: claims?.empresaId, allowed: status === 'authenticated' && isAdministrator(claims) };
}
function useAdminScope() {
  const { claims, user } = useAuth();
  return ['business', user?.id, claims?.sid];
}
// Listagem global independe do contexto operacional. O POST retorna a empresa criada.
export function useCompanies() {
  const client = useQueryClient();
  const key = useAdminScope();
  const access = useBusinessAccess();
  const query = useQuery({ queryKey: [...key, 'companies'], queryFn: listEmpresas, enabled: access.allowed });
  const create = useMutation({
    mutationFn: createEmpresa,
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, 'companies'] })
  });
  return { ...access, query, create };
}
// selectedCompanyId pertence apenas à gestão: não altera claims, activeStore ou o refresh.
export function useBusiness(selectedCompanyId) {
  const client = useQueryClient();
  const key = useAdminScope();
  const access = useBusinessAccess();
  const enabled = access.allowed && Boolean(selectedCompanyId);
  const companyKey = [...key, 'company', String(selectedCompanyId)];
  // O GET atual não recebe empresaId. Não fingir que seu resultado atende outra empresa.
  const canListStores =
    enabled && Boolean(access.empresaId) && String(access.empresaId) === String(selectedCompanyId);
  const empresaQuery = useQuery({
    queryKey: companyKey,
    queryFn: () => getEmpresa(selectedCompanyId),
    enabled
  });
  const lojasQuery = useQuery({
    queryKey: [...companyKey, 'stores'],
    queryFn: () => listLojas(selectedCompanyId),
    enabled: canListStores
  });
  const empresaMutation = useMutation({
    mutationFn: (body) => updateEmpresa(selectedCompanyId, body),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: companyKey, exact: true }),
        client.invalidateQueries({ queryKey: [...key, 'companies'], exact: true })
      ])
  });
  const lojaMutation = useMutation({
    mutationFn: ({ loja, body }) =>
      loja ? updateLoja(selectedCompanyId, loja.id, body) : createLoja(selectedCompanyId, body),
    // Invalida somente a empresa alvo; o seletor operacional refaz seus vínculos sem trocar loja.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: [...companyKey, 'stores'], exact: true }),
        client.invalidateQueries({ queryKey: ['my-stores'] })
      ])
  });
  return {
    ...access,
    empresaId: selectedCompanyId,
    canListStores,
    empresaQuery,
    lojasQuery,
    empresaMutation,
    lojaMutation
  };
}
