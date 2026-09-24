import { apiRequest } from './client.js';
import { lojaPayload } from '../components/business/business-model.js';

// Contratos oficiais retornam DTOs diretamente, sem envelope data e sem rotas do backend legado.
export const listEmpresas = (signal) => apiRequest('/Empresa', { signal });
export const getEmpresa = (id, signal) => apiRequest(`/Empresa/${encodeURIComponent(id)}`, { signal });
export const listLojas = (signal) => apiRequest('/Loja', { signal });
export const getLoja = (id, signal) => apiRequest(`/Loja/${encodeURIComponent(id)}`, { signal });
const save = (path, method, body) =>
  apiRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
// Allowlist mantém IDs, campos de resposta e dados de outras empresas fora das mutations.
export const updateEmpresa = (id, body) =>
  save(`/Empresa/${encodeURIComponent(id)}`, 'PUT', { nome: body.nome.trim(), ativo: body.ativo });
export const createLoja = (empresaId, body) => save('/Loja', 'POST', lojaPayload(empresaId, body, false));
export const updateLoja = (id, body) =>
  save(`/Loja/${encodeURIComponent(id)}`, 'PUT', lojaPayload(body.empresaId, body, true));
