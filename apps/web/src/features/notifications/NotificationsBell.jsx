import { useState } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useNotifications } from './notifications-queries.js';
import { NotificationTopic, NotificationsUnavailable } from './NotificationTopics.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';

// O sino compartilha o resumo com a central. Abrir não marca visualização nem carrega detalhes.
export function NotificationsBell() {
  const [anchor, setAnchor] = useState(null);
  const query = useNotifications();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const close = () => setAnchor(null);
  const unread = query.data?.available ? query.data.unreadTopicCount : 0;
  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          aria-label={unread ? `Notificações: ${unread} tópicos não visualizados` : 'Notificações'}
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? 'notifications-panel' : undefined}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        transitionDuration={reduced ? 0 : 180}
        slotProps={{
          paper: {
            sx: {
              width: 430,
              maxWidth: 'calc(100vw - 24px)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2
            }
          }
        }}
      >
        <Box id="notifications-panel" role="dialog" aria-labelledby="notifications-heading">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
            <Typography id="notifications-heading" component="h2" variant="h3">
              Notificações
            </Typography>
            <IconButton aria-label="Fechar notificações" onClick={close}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Divider />
          <Stack
            spacing={2}
            divider={<Divider />}
            sx={{ p: 2, maxHeight: 'min(55vh, 480px)', overflowY: 'auto' }}
          >
            {query.isPending ? (
              <Skeleton height={110} />
            ) : query.isError ? (
              <ErrorState description="Não foi possível carregar as notificações." onRetry={query.refetch} />
            ) : !query.data?.available ? (
              <NotificationsUnavailable />
            ) : !query.data.topics.length ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum alerta neste contexto.
              </Typography>
            ) : (
              query.data.topics.map((topic) => (
                <NotificationTopic key={topic.id} topic={topic} onNavigate={close} />
              ))
            )}
          </Stack>
          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Button component={Link} to="/notifications" fullWidth onClick={close}>
              Ver todas as notificações
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
