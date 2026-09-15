import { apiRequest } from './client.js';

// O backend novo deriva o funcionÃ¡rio do JWT; nenhuma empresa ou loja Ã© enviada pelo navegador.
export async function getMyStores() {
  const response = await apiRequest('/FuncionarioLoja/minhasLojas');
  const items = response?.data ?? response ?? [];
  return items.map((store) => ({
    id: String(store.id),
    empresaId: String(store.empresaId),
    nome: store.nome,
    nomeFantasia: store.nome,
    ativo: Boolean(store.ativo)
  }));
}
