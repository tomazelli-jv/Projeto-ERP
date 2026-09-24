import { apiRequest } from './client.js';

import { mapUser, createUserDto, updateUserDto } from './user-contract.js';

// Client oficial reutiliza Bearer, cookies e refresh existentes, sem headers de contexto.
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const paginated = async ({ pagina = 1, tamanhoPagina = 10, busca = '' }, signal) => {
  const query = new URLSearchParams({ pagina: String(pagina), tamanhoPagina: String(tamanhoPagina), busca });
  const result = await apiRequest(`/Funcionario/paginado?${query}`, { signal });
  if (!Array.isArray(result?.itens) || !Number.isInteger(result.totalRegistros))
    throw new Error('Resposta de listagem inválida.');
  return result;
};
export const usersApi = {
  getById: async (id, signal) =>
    mapUser(await apiRequest(`/Funcionario/${encodeURIComponent(id)}`, { signal })),
  count: async (signal) => (await paginated({ tamanhoPagina: 1 }, signal)).totalRegistros,
  list: async (filters, signal) => {
    const result = await paginated(filters, signal);
    // O paginado atual não inclui Usuario: e-mail/status vêm do detalhe da página visível.
    // Falha isolada não transforma o fallback false do paginado em um usuário inativo fictício.
    const items = await Promise.all(
      result.itens.map(async (dto) => {
        try {
          return await usersApi.getById(dto.id, signal);
        } catch (error) {
          if (signal?.aborted || [401, 403].includes(error.status)) throw error;
          return {
            ...mapUser(dto),
            email: '',
            userName: '',
            ativo: null,
            vinculoIds: [],
            detailUnavailable: true
          };
        }
      })
    );
    return { items, total: result.totalRegistros, page: filters.pagina, pageSize: filters.tamanhoPagina };
  },
  create: async (form) => mapUser(await apiRequest('/Funcionario', json('POST', createUserDto(form)))),
  update: async (id, form) =>
    mapUser(await apiRequest(`/Funcionario/${encodeURIComponent(id)}`, json('PUT', updateUserDto(form))))
};
