const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Não foi possível concluir a solicitação.');
    error.code = payload?.error?.code ?? 'REQUEST_FAILED';
    error.requestId = payload?.error?.requestId;
    throw error;
  }
  return payload;
}
