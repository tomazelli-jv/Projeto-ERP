import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/auth/auth-context.js';
import { notificationsSource } from './notifications-source.js';

// Identidade e contexto fazem parte de todas as chaves. Não reutiliza o resumo da loja anterior.
// Permissão é responsabilidade do servidor: nenhuma role ou exceção ADM é inventada no cliente.
export function useNotifications(scope = 'current') {
  const { claims } = useAuth();
  const context = [claims?.sub ?? '', claims?.empresaId ?? '', claims?.lojaId ?? ''];
  return useQuery({
    queryKey: ['notifications', ...context, scope, 'summary'],
    queryFn: ({ signal }) => notificationsSource.summary({ scope, signal }),
    enabled: Boolean(claims?.sub),
    staleTime: 60000,
    retry: false
  });
}
export function useNotificationOccurrences(topicId, page, scope) {
  const { claims } = useAuth();
  return useQuery({
    queryKey: [
      'notifications',
      claims?.sub ?? '',
      claims?.empresaId ?? '',
      claims?.lojaId ?? '',
      scope,
      'occurrences',
      topicId,
      page
    ],
    queryFn: ({ signal }) => notificationsSource.occurrences({ topicId, page, pageSize: 20, scope, signal }),
    enabled: Boolean(claims?.sub && topicId),
    retry: false
  });
}
