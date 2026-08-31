import { apiRequest } from './client.js';

let refreshPromise = null;

export async function login(email, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    authenticated: false,
    retryUnauthorized: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.data;
}

export function refresh() {
  if (!refreshPromise) {
    refreshPromise = apiRequest('/auth/refresh', {
      method: 'POST',
      authenticated: false,
      retryUnauthorized: false
    })
      .then((response) => response.data)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function logout() {
  await apiRequest('/auth/logout', {
    method: 'POST',
    authenticated: false,
    retryUnauthorized: false
  });
}

export async function getCurrentUser() {
  const response = await apiRequest('/auth/me');
  return response.data;
}

export async function getSessions() {
  const response = await apiRequest('/auth/sessions');
  return response.data;
}

export async function revokeSession(sessionId) {
  await apiRequest(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

export async function logoutAll() {
  await apiRequest('/auth/logout-all', { method: 'POST' });
}
