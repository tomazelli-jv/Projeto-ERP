const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

let getAccessToken = () => null;
let refreshSession = null;
let handleUnauthenticated = () => {};

export function configureApiAuthentication(configuration) {
  getAccessToken = configuration.getAccessToken;
  refreshSession = configuration.refreshSession;
  handleUnauthenticated = configuration.handleUnauthenticated;
}

export async function apiRequest(path, options = {}) {
  const { authenticated = true, retryUnauthorized = true, headers, ...fetchOptions } = options;
  const accessToken = authenticated ? getAccessToken() : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers
    }
  });

  if (response.status === 401 && authenticated && retryUnauthorized && refreshSession) {
    try {
      await refreshSession();
      return apiRequest(path, { ...options, retryUnauthorized: false });
    } catch {
      handleUnauthenticated();
    }
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Não foi possível concluir a solicitação.');
    error.code = payload?.error?.code ?? 'REQUEST_FAILED';
    error.requestId = payload?.error?.requestId;
    throw error;
  }
  return payload;
}
