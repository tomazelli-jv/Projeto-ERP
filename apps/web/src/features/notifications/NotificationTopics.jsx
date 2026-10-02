import PropTypes from 'prop-types';
import { Link } from 'react-router';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { notificationDestination, notificationSeverities } from './notifications-model.js';

const icons = {
  products: Inventory2OutlinedIcon,
  inventory: Inventory2OutlinedIcon,
  financial: AccountBalanceWalletOutlinedIcon,
  sales: StorefrontOutlinedIcon,
  security: ShieldOutlinedIcon
};
// Um único destaque por tópico: o dropdown nunca monta a lista completa de ocorrências.
export function NotificationTopic({ topic, onNavigate }) {
  const Icon = icons[topic.category] ?? InfoOutlinedIcon;
  const priority = notificationSeverities[topic.severity] ?? notificationSeverities.info;
  const destination = notificationDestination(topic.actionUrl);
  return (
    <Stack spacing={1} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Icon fontSize="small" color={priority.color} />
        <Typography component="h3" variant="subtitle2" fontWeight={700}>
          {topic.label}
        </Typography>
        <Chip size="small" label={topic.count} aria-label={`${topic.count} ocorrências`} />
        <Chip size="small" variant="outlined" color={priority.color} label={priority.label} />
        {topic.unseen && (
          <Typography variant="caption" color="text.secondary">
            Não visualizado
          </Typography>
        )}
      </Stack>
      {topic.highlight && (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {topic.highlight.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {topic.highlight.description}
          </Typography>
        </Box>
      )}
      <Typography variant="body2" color="text.secondary">
        {topic.summary}
      </Typography>
      {topic.highlight && topic.count > 1 && (
        <Typography variant="caption" color="text.secondary">
          Mais {topic.count - 1} ocorrências neste tópico
        </Typography>
      )}
      {destination ? (
        <Button
          component={Link}
          to={destination}
          onClick={onNavigate}
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        >
          Visualizar todos →
        </Button>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Consulta detalhada pela Central de Notificações.
        </Typography>
      )}
    </Stack>
  );
}
NotificationTopic.propTypes = { topic: PropTypes.object.isRequired, onNavigate: PropTypes.func };
export function NotificationsUnavailable() {
  return (
    <Alert severity="info">
      Notificações aguardando integração. O serviço de alertas por empresa, loja e permissões ainda não está
      disponível.
    </Alert>
  );
}
