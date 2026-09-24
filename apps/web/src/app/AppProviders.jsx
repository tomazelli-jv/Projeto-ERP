import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { OperationalContextProvider } from './operational-context/OperationalContextProvider.jsx';
import { ThemeModeProvider } from './ThemeModeProvider.jsx';

export function AppProviders({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        {/* Contexto operacional fica abaixo da autenticação para nunca consultar antes da sessão estar pronta. */}
        <AuthProvider>
          <OperationalContextProvider>{children}</OperationalContextProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}

AppProviders.propTypes = {
  children: PropTypes.node.isRequired
};
