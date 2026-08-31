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
