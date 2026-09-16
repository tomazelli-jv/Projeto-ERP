import { apiRequest } from './client.js';
import { normalizeSessions } from './session-formatters.js';

let refreshPromise = null;

// O contrato oficial aceita tanto username quanto e-mail no mesmo campo.
export function login(usuarioOuEmail, senha) {
  return apiRequest('/auth/login', {
    method: 'POST',
    authenticated: false,
    retryUnauthorized: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioOuEmail, senha })
  });
}

// O token temporÃ¡rio existe apenas no argumento em memÃ³ria e autoriza exclusivamente a seleÃ§Ã£o inicial.
export function selectInitialStore(tokenSelecaoLoja, lojaId) {
  return apiRequest('/auth/selecionar-loja', {
    method: 'POST',
    authenticated: false,
    retryUnauthorized: false,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSelecaoLoja}` },
    body: JSON.stringify({ lojaId })
  });
}

export function switchStore(lojaId) {
  return apiRequest('/auth/trocar-loja', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojaId })
  });
}

// Uma Promise Ãºnica evita que cookies rotativos sejam consumidos simultaneamente por vÃ¡rias respostas 401.
export function refresh() {
  if (!refreshPromise) {
    refreshPromise = apiRequest('/auth/refresh', {
      method: 'POST',
      authenticated: false,
      retryUnauthorized: false
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST', authenticated: false, retryUnauthorized: false });
}

export async function getSessions() {
  const response = await apiRequest('/auth/sessoes');
  // O endpoint oficial retorna uma lista direta de SessaoDto.
  return normalizeSessions(response);
}

export function revokeSession(sessionId) {
  return apiRequest(`/auth/sessoes/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

export function logoutAll() {
  return apiRequest('/auth/logout-todas', { method: 'POST' });
}
