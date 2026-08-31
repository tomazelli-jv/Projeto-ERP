import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
  logoutAll as requestLogoutAll,
  refresh
} from '../../api/auth.js';
import { configureApiAuthentication } from '../../api/client.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef(null);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const storeAccessToken = useCallback((token) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  const clearAuthentication = useCallback(() => {
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    const result = await refresh();
    storeAccessToken(result.accessToken);
    return result.accessToken;
  }, [storeAccessToken]);

  useEffect(() => {
    configureApiAuthentication({
      getAccessToken: () => accessTokenRef.current,
      refreshSession,
      handleUnauthenticated: clearAuthentication
    });
  }, [clearAuthentication, refreshSession]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        await refreshSession();
        const currentUser = await getCurrentUser();
        if (active) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      } catch {
        if (active) clearAuthentication();
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, [clearAuthentication, refreshSession]);

  const login = useCallback(
    async (email, password) => {
      queryClient.clear();
      const result = await requestLogin(email, password);
      storeAccessToken(result.accessToken);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setStatus('authenticated');
        return currentUser;
      } catch (error) {
        clearAuthentication();
        throw error;
      }
    },
    [clearAuthentication, queryClient, storeAccessToken]
  );

  const logout = useCallback(async () => {
    try {
      await requestLogout();
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const logoutAll = useCallback(async () => {
    await requestLogoutAll();
    clearAuthentication();
  }, [clearAuthentication]);

  const value = useMemo(
    () => ({ status, user, accessToken, login, logout, logoutAll, refreshSession }),
    [accessToken, login, logout, logoutAll, refreshSession, status, user]
  );

  if (status === 'loading') {
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
