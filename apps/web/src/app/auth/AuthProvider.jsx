import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  login as requestLogin,
  logout as requestLogout,
  logoutAll as requestLogoutAll,
  refresh,
  selectInitialStore
} from '../../api/auth.js';
import { configureApiAuthentication } from '../../api/client.js';
import { decodeJwtPayload } from '../../api/jwt.js';
import { AuthContext } from './auth-context.js';

const metadataKey = 'erp.session.display';
const terminalAuthCodes = new Set([
  'REFRESH_TOKEN_INVALIDO',
  'REFRESH_TOKEN_EXPIRADO',
  'REFRESH_TOKEN_REUTILIZADO',
  'SESSAO_INVALIDA'
]);

function readMetadata() {
  try {
    return JSON.parse(sessionStorage.getItem(metadataKey)) ?? {};
  } catch {
    return {};
  }
}

function identityFrom(token, response = {}) {
  const claims = decodeJwtPayload(token) ?? {};
  const previous = readMetadata();
  const metadata = {
    userName: response.userName ?? previous.userName,
    email: response.email ?? claims.email ?? previous.email
  };
  try {
    sessionStorage.setItem(metadataKey, JSON.stringify(metadata));
  } catch {
    /* A sessão continua sem metadados visuais. */
  }
  const email = metadata.email ?? '';
  return {
    claims,
    user: {
      id: String(response.usuarioId ?? claims.sub ?? ''),
      name: metadata.userName ?? email,
      email,
      status: 'active'
    }
  };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef(null);
  const [accessToken, setAccessToken] = useState(null);
  const [claims, setClaims] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [storeSelection, setStoreSelection] = useState(null);

  // Toda conclusão de login passa por este ponto para manter token e claims exclusivamente em memória.
  const acceptAccessToken = useCallback((result) => {
    if (!result?.accessToken) throw new Error('O backend não retornou um Access Token.');
    const identity = identityFrom(result.accessToken, result);
    accessTokenRef.current = result.accessToken;
    setAccessToken(result.accessToken);
    setClaims(identity.claims);
    setUser(identity.user);
    setStoreSelection(null);
    setStatus('authenticated');
    return identity.user;
  }, []);

  const clearAuthentication = useCallback(() => {
    accessTokenRef.current = null;
    setAccessToken(null);
    setClaims(null);
    setUser(null);
    setStoreSelection(null);
    setStatus('unauthenticated');
    try {
      sessionStorage.removeItem(metadataKey);
    } catch {
      /* Limpeza em memória continua suficiente para tokens. */
    }
    queryClient.clear();
  }, [queryClient]);

  const refreshSession = useCallback(async () => acceptAccessToken(await refresh()), [acceptAccessToken]);

  useEffect(() => {
    configureApiAuthentication({
      getAccessToken: () => accessTokenRef.current,
      refreshSession,
      handleUnauthenticated: clearAuthentication
    });
  }, [clearAuthentication, refreshSession]);

  // Após F5, somente o cookie HttpOnly pode restaurar a sessão; /auth/me e tokens persistidos não são usados.
  useEffect(() => {
    let active = true;
    refreshSession().catch((error) => {
      if (active && (error.status === 401 || terminalAuthCodes.has(error.code))) clearAuthentication();
      else if (active) clearAuthentication();
    });
    return () => {
      active = false;
    };
  }, [clearAuthentication, refreshSession]);

  const login = useCallback(
    async (usuarioOuEmail, senha) => {
      queryClient.clear();
      const result = await requestLogin(usuarioOuEmail, senha);
      if (result.requerSelecaoLoja) {
        // Token de seleção e lojas transitórias nunca saem do estado React.
        setStoreSelection({ token: result.tokenSelecaoLoja, stores: result.lojasDisponiveis ?? [] });
        setStatus('selecting-store');
        return null;
      }
      return acceptAccessToken(result);
    },
    [acceptAccessToken, queryClient]
  );

  const selectStore = useCallback(
    async (storeId) => {
      const numericId = Number(storeId);
      if (!storeSelection?.token || !Number.isSafeInteger(numericId) || numericId <= 0)
        throw new Error('Selecione uma loja válida.');
      return acceptAccessToken(await selectInitialStore(storeSelection.token, numericId));
    },
    [acceptAccessToken, storeSelection]
  );

  const cancelStoreSelection = useCallback(() => {
    setStoreSelection(null);
    setStatus('unauthenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await requestLogout();
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const logoutAll = useCallback(async () => {
    try {
      await requestLogoutAll();
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const value = useMemo(
    () => ({
      status,
      user,
      accessToken,
      claims,
      login,
      logout,
      logoutAll,
      refreshSession,
      storeSelection,
      selectStore,
      cancelStoreSelection,
      acceptAccessToken
    }),
    [
      accessToken,
      acceptAccessToken,
      cancelStoreSelection,
      claims,
      login,
      logout,
      logoutAll,
      refreshSession,
      selectStore,
      status,
      storeSelection,
      user
    ]
  );

  if (status === 'loading')
    return (
      <Box sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
        <Stack alignItems="center" spacing={2} role="status">
          <Typography color="primary.dark" fontWeight={800} variant="h5">
            Tomazelli ERP
          </Typography>
          <CircularProgress size={32} />
          <Typography color="text.secondary">Carregando sua sessão...</Typography>
        </Stack>
      </Box>
    );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
