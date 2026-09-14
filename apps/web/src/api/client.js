const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5054/api').replace(/\/$/, '');

let getAccessToken = () => null;
let refreshSession = null;
let handleUnauthenticated = () => {};

// O cliente recebe o token somente por callback em memÃ³ria e nunca conhece mecanismos de persistÃªncia.
export function configureApiAuthentication(configuration) {
  getAccessToken = configuration.getAccessToken;
  refreshSession = configuration.refreshSession;
  handleUnauthenticated = configuration.handleUnauthenticated;
}

// Mantida temporariamente para mÃ³dulos ainda nÃ£o migrados; o novo backend representa a loja no JWT e nenhum header Ã© gerado.
export function configureApiOperationalContext() {}

function normalizeError(response, payload) {
  const body = payload?.error ?? payload ?? {};
  const error = new Error(
    body.mensagem ?? body.Mensagem ?? body.message ?? 'NÃ£o foi possÃ­vel concluir a solicitaÃ§Ã£o.'
  );
  error.code = body.codigo ?? body.Codigo ?? body.code ?? 'REQUEST_FAILED';
  error.status = response.status;
  error.requestId = body.requestId ?? body.RequestId;
  return error;
}

export async function apiRequest(path, options = {}) {
  const { authenticated = true, retryUnauthorized = true, headers, ...fetchOptions } = options;
  // A propriedade legada Ã© descartada antes do fetch e permanece um no-op sem produzir X-Loja-Id.
  delete fetchOptions.storeScoped;
  const token = authenticated ? getAccessToken() : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  // Cada request pode ser repetida uma Ãºnica vez; AuthProvider compartilha a Promise de refresh entre chamadas concorrentes.
  if (response.status === 401 && authenticated && retryUnauthorized && refreshSession) {
    try {
      await refreshSession();
      return apiRequest(path, { ...options, retryUnauthorized: false });
    } catch {
      handleUnauthenticated();
    }
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  // Uma segunda resposta 401 prova que a sessÃ£o nÃ£o pode ser recuperada e encerra o estado local sem novo loop.
  if (!response.ok) {
    if (response.status === 401 && authenticated) handleUnauthenticated();
    throw normalizeError(response, payload);
  }
  return payload;
}
