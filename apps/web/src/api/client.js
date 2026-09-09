const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

let getAccessToken = () => null;
let refreshSession = null;
let handleUnauthenticated = () => {};
let getActiveStoreId = () => null;

export function configureApiAuthentication(configuration) {
  getAccessToken = configuration.getAccessToken;
  refreshSession = configuration.refreshSession;
  handleUnauthenticated = configuration.handleUnauthenticated;
}

// Configuração desacopla o cliente HTTP do React e permite obter a loja ativa somente quando solicitada.
export function configureApiOperationalContext(configuration) {
  getActiveStoreId = configuration.getActiveStoreId;
}

export async function apiRequest(path, options = {}) {
  const {
    authenticated = true,
    retryUnauthorized = true,
    storeScoped = false,
    headers,
    ...fetchOptions
  } = options;
  const accessToken = authenticated ? getAccessToken() : null;
  const activeStoreId = storeScoped ? getActiveStoreId() : null;
  // Requisições operacionais falham localmente sem enviar um header vazio ou contexto inválido à API.
  if (storeScoped && !activeStoreId) {
    const error = new Error('Selecione uma loja ativa para continuar.');
    error.code = 'STORE_CONTEXT_REQUIRED';
    throw error;
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(storeScoped ? { 'X-Loja-Id': activeStoreId } : {}),
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
