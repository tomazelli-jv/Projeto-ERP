import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../app/auth/auth-context.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import {
  NotificationTopic,
  NotificationsUnavailable
} from '../features/notifications/NotificationTopics.jsx';
import {
  useNotifications,
  useNotificationOccurrences
} from '../features/notifications/notifications-queries.js';
import {
  filterNotificationTopics,
  notificationCategories
} from '../features/notifications/notifications-model.js';

// Expansão monta a query somente sob demanda. Cada página contém no máximo 20 ocorrências.
function Occurrences({ topicId, scope }) {
  const [page, setPage] = useState(1);
  const query = useNotificationOccurrences(topicId, page, scope);
  if (query.isPending) return <Skeleton height={140} />;
  if (query.isError)
    return <ErrorState description="Não foi possível carregar as ocorrências." onRetry={query.refetch} />;
  return (
    <Stack spacing={2}>
      {query.data.items.length ? (
        query.data.items.map((item) => (
          <Box key={item.id}>
            <Typography variant="body2" fontWeight={600}>
              {item.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="body2">Nenhuma ocorrência encontrada.</Typography>
      )}
      <Pagination
        count={Math.max(1, query.data.totalPages)}
        page={query.data.page}
        onChange={(_, value) => setPage(value)}
        size="small"
      />
    </Stack>
  );
}
Occurrences.propTypes = { topicId: PropTypes.string.isRequired, scope: PropTypes.string.isRequired };
function NotificationCenter() {
  const [category, setCategory] = useState('all');
  const [state, setState] = useState('all');
  const [scope, setScope] = useState('current');
  const [expanded, setExpanded] = useState(null);
  const current = useNotifications();
  const authorizedScope = current.data?.canViewAllStores ? scope : 'current';
  const query = useNotifications(authorizedScope);
  const topics = filterNotificationTopics(query.data?.topics ?? [], category, state);
  return (
    <>
      <PageHeader
        title="Central de Notificações"
        description="Alertas e acontecimentos organizados por tópico."
      />
      <Stack spacing={3}>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}
        >
          <TextField select label="Tópico" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(notificationCategories).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Exibir" value={state} onChange={(e) => setState(e.target.value)}>
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="unseen">Não visualizados</MenuItem>
            <MenuItem value="critical">Críticos</MenuItem>
          </TextField>
          <TextField
            select
            label="Abrangência"
            value={authorizedScope}
            onChange={(e) => {
              setScope(e.target.value);
              setExpanded(null);
            }}
          >
            <MenuItem value="current">Loja atual</MenuItem>
            {current.data?.canViewAllStores && <MenuItem value="all">Todas as lojas autorizadas</MenuItem>}
          </TextField>
        </Box>
        {query.isPending ? (
          <Skeleton height={220} />
        ) : query.isError ? (
          <ErrorState description="Não foi possível carregar as notificações." onRetry={query.refetch} />
        ) : !query.data?.available ? (
          <NotificationsUnavailable />
        ) : !topics.length ? (
          <Typography color="text.secondary">
            Nenhum tópico encontrado com os filtros selecionados.
          </Typography>
        ) : (
          topics.map((topic) => (
            <Box key={topic.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <NotificationTopic topic={topic} />
              <Accordion
                elevation={0}
                expanded={expanded === topic.id}
                onChange={(_, open) => setExpanded(open ? topic.id : null)}
                sx={{ mt: 1, '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  id={`topic-${topic.id}`}
                  aria-controls={`occurrences-${topic.id}`}
                >
                  Consultar ocorrências
                </AccordionSummary>
                <AccordionDetails id={`occurrences-${topic.id}`}>
                  {expanded === topic.id && (
                    <Occurrences
                      topicId={topic.id}
                      scope={authorizedScope}
                      key={`${topic.id}-${authorizedScope}`}
                    />
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>
          ))
        )}
      </Stack>
    </>
  );
}
// Trocar identidade/empresa/loja desmonta os estados locais, inclusive o escopo ampliado.
export function NotificationsPage() {
  const { claims } = useAuth();
  return <NotificationCenter key={JSON.stringify([claims?.sub, claims?.empresaId, claims?.lojaId])} />;
}
