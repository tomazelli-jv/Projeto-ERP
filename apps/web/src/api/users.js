import { apiRequest } from './client.js';

// Wrapper único mantém autenticação, refresh e erros padronizados em todas as operações administrativas.
const data = async (path, options) => (await apiRequest(path, options)).data;
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const listUsers = () => data('/usuarios');
export const getUser = (id) => data(`/usuarios/${encodeURIComponent(id)}`);
export const listEmployees = () => data('/funcionarios');
export const getEmployee = (id) => data(`/funcionarios/${encodeURIComponent(id)}`);
export const listProfiles = () => data('/perfis');
export const listBusinessStores = () => data('/lojas');

// Senha segue apenas na criação e nunca é mantida no cache de respostas.
export const createUserEmployee = (body) => data('/usuarios-funcionarios', json('POST', body));
export const updateUser = (id, body) => data(`/usuarios/${encodeURIComponent(id)}`, json('PUT', body));
export const updateEmployee = (id, body) =>
  data(`/funcionarios/${encodeURIComponent(id)}`, json('PUT', body));
export const updateUserProfile = (id, body) =>
  data(`/usuarios/${encodeURIComponent(id)}/perfil`, json('PUT', body));
export const updateEmployeeStores = (id, body) =>
  data(`/funcionarios/${encodeURIComponent(id)}/lojas`, json('PUT', body));
