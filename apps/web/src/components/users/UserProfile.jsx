import { Avatar, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PropTypes from 'prop-types';
import { Link } from 'react-router';
import { SectionCard } from '../common/SectionCard.jsx';
import { userInitials } from './user-model.js';

const cardStyle = {
  minWidth: 0,
  borderRadius: 2,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, transparent)`
  },
  '& .MuiCardContent-root > .MuiStack-root:first-of-type .MuiSvgIcon-root': {
    boxSizing: 'content-box',
    p: 1.25,
    borderRadius: 1.5,
    bgcolor: 'primary.soft'
  }
};

// Only the selected user's response is displayed; session claims describe the viewer, not this profile.
export function UserProfile({ user, canEdit }) {
  const status = user.ativo === null ? 'Não informado' : user.ativo ? 'Ativo' : 'Inativo';
  const statusColor = user.ativo === null ? 'default' : user.ativo ? 'success' : 'error';
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1.85fr) minmax(0,1fr)' },
        gap: 3,
        alignItems: 'start'
      }}
    >
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <SectionCard
          sx={{
            ...cardStyle,
            borderColor: 'primary.border',
            background: (theme) =>
              `linear-gradient(120deg, ${theme.palette.primary.soft}, ${theme.palette.background.paper} 65%)`
          }}
        >
          <SecurityOutlinedIcon
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: -25,
              top: 10,
              fontSize: 230,
              opacity: 0.035,
              pointerEvents: 'none'
            }}
          />
          <Stack spacing={3} sx={{ position: 'relative' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: 3,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: 32,
                  fontWeight: 700
                }}
              >
                {userInitials(user.nome)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="h2" variant="h2" sx={{ overflowWrap: 'anywhere', mb: 1 }}>
                  {user.nome || 'Nome não informado'}
                </Typography>
                <Chip size="small" label={status} color={statusColor} />
              </Box>
              {canEdit && (
                <Button
                  component={Link}
                  to={`/admin/users/${user.id}/edit`}
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  Editar usuário
                </Button>
              )}
            </Stack>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {[
                [AlternateEmailIcon, user.userName],
                [MailOutlineIcon, user.email]
              ].map(([Icon, value], index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, px: 2, py: 1.25, minWidth: 0 }}
                >
                  <Icon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {value || 'Não informado'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </SectionCard>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'minmax(0,1fr) minmax(0,1.25fr)' },
            gap: 3
          }}
        >
          <SectionCard title="Dados do usuário" icon={BadgeOutlinedIcon} sx={cardStyle}>
            <Stack spacing={2.5}>
              {[
                ['Nome completo', user.nome],
                ['Usuário (login)', user.userName],
                ['E-mail', user.email]
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography sx={{ overflowWrap: 'anywhere' }}>{value || 'Não informado'}</Typography>
                </Box>
              ))}
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" variant="body2">
                  Status
                </Typography>
                <Chip size="small" label={status} color={statusColor} />
              </Stack>
            </Stack>
          </SectionCard>
          <SectionCard
            title="Permissões e acessos"
            subtitle="Vínculos do colaborador"
            icon={SecurityOutlinedIcon}
            sx={cardStyle}
          >
            <Stack spacing={2.5}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
                <Typography fontWeight={600}>{user.vinculoIds.length} vínculo(s) de loja</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Os nomes das lojas e os perfis desses vínculos não estão disponíveis nesta consulta.
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                As permissões detalhadas deste colaborador ainda não estão disponíveis.
              </Typography>
            </Stack>
          </SectionCard>
        </Box>
      </Stack>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <SectionCard
          title="Dados bancários"
          subtitle="Informações do colaborador"
          icon={AccountBalanceWalletOutlinedIcon}
          sx={cardStyle}
        >
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Dados bancários não disponíveis nesta consulta.
          </Typography>
        </SectionCard>
        <SectionCard title="Histórico" subtitle="Atividades mais recentes" icon={HistoryIcon} sx={cardStyle}>
          <Stack spacing={1} sx={{ py: 3, pl: 2, borderLeft: 2, borderColor: 'primary.border' }}>
            <Typography fontWeight={600}>Histórico ainda não disponível</Typography>
            <Typography variant="body2" color="text.secondary">
              As atividades deste colaborador aparecerão aqui quando estiverem disponíveis.
            </Typography>
          </Stack>
        </SectionCard>
      </Stack>
    </Box>
  );
}

UserProfile.propTypes = { user: PropTypes.object.isRequired, canEdit: PropTypes.bool.isRequired };
