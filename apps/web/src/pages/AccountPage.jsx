import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getSessions, revokeSession } from '../api/auth.js';
import { useAuth } from '../app/auth/auth-context.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { StatusChip } from '../components/common/StatusChip.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';

const sessionQueryKey = ['auth', 'sessions'];
const accountStatuses = { active: 'Ativo', pending: 'Pendente', blocked: 'Bloqueado', inactive: 'Inativo' };
const sessionStatuses = { active: 'Ativa', revoked: 'Encerrada', expired: 'Expirada' };

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function AccountPage() {
  const { user, logoutAll } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const sessionsQuery = useQuery({ queryKey: sessionQueryKey, queryFn: getSessions });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      setSessionToRevoke(null);
      setFeedback({ severity: 'success', message: 'Sessão encerrada com sucesso.' });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
    onError: (error) => {
      setSessionToRevoke(null);
      setFeedback({
        severity: 'error',
        message: 'Não foi possível encerrar a sessão.',
        requestId: error.requestId
      });
    }
  });

  const logoutAllMutation = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => navigate('/login', { replace: true }),
    onError: (error) => {
      setLogoutAllOpen(false);
      setFeedback({
        severity: 'error',
        message: 'Não foi possível sair de todos os dispositivos.',
        requestId: error.requestId
      });
    }
  });

  return (
    <>
      <PageHeader
        title="Minha Conta"
        description="Consulte seu perfil e gerencie a segurança da sua conta."
      />
      <Stack spacing={3}>
        <SectionCard title="Perfil" subtitle="Informações da sua identidade no Tomazelli ERP.">
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Typography color="text.secondary" variant="caption">
                Nome
              </Typography>
              <Typography fontWeight={650}>{user.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Typography color="text.secondary" variant="caption">
                E-mail
              </Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Typography color="text.secondary" display="block" variant="caption">
                Status da conta
              </Typography>
              <StatusChip labels={accountStatuses} status={user.status} sx={{ mt: 0.5 }} />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Segurança"
          subtitle="Revise onde sua conta está conectada e encerre acessos que não reconhece."
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography component="h3" fontWeight={700}>
                  Sessões
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Dispositivos que acessaram sua conta.
                </Typography>
              </Box>
              <Button
                color="error"
                disabled={logoutAllMutation.isPending}
                onClick={() => setLogoutAllOpen(true)}
                startIcon={<LogoutOutlinedIcon />}
                variant="outlined"
              >
                Sair de todos os dispositivos
              </Button>
            </Stack>
            <Divider />

            {sessionsQuery.isPending && <LoadingState message="Carregando sessões..." />}

            {sessionsQuery.isError && (
              <ErrorState
                onRetry={() => sessionsQuery.refetch()}
                requestId={sessionsQuery.error.requestId}
                title="Não foi possível carregar suas sessões."
              />
            )}

            {sessionsQuery.isSuccess && sessionsQuery.data.length === 0 && (
              <Alert severity="info">Nenhuma sessão ativa encontrada.</Alert>
            )}

            {sessionsQuery.isSuccess && sessionsQuery.data.length > 0 && (
              <Grid container spacing={2}>
                {sessionsQuery.data.map((session) => (
                  <Grid key={session.id} size={{ xs: 12, lg: 6 }}>
                    <Card
                      sx={{
                        height: '100%',
                        borderColor: session.current ? 'primary.main' : 'divider',
                        bgcolor: session.current ? 'primary.light' : 'background.paper'
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                              <DevicesOutlinedIcon color="action" />
                              <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                                {session.device || 'Dispositivo não identificado'}
                              </Typography>
                            </Stack>
                            {session.current && <StatusChip label="Sessão atual" status="active" />}
                          </Stack>
                          <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography color="text.secondary" variant="caption">
                                Criada em
                              </Typography>
                              <Typography variant="body2">{formatDate(session.createdAtUtc)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography color="text.secondary" variant="caption">
                                Último uso
                              </Typography>
                              <Typography variant="body2">{formatDate(session.lastUsedAtUtc)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography color="text.secondary" variant="caption">
                                Expira em
                              </Typography>
                              <Typography variant="body2">{formatDate(session.expiresAtUtc)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography color="text.secondary" display="block" variant="caption">
                                Status
                              </Typography>
                              <StatusChip labels={sessionStatuses} status={session.status} />
                            </Grid>
                          </Grid>
                          {!session.current && session.status === 'active' && (
                            <Button
                              color="error"
                              disabled={revokeMutation.isPending && sessionToRevoke?.id === session.id}
                              onClick={() => setSessionToRevoke(session)}
                              sx={{ alignSelf: 'flex-end' }}
                              variant="text"
                            >
                              Encerrar sessão
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Stack>
        </SectionCard>
      </Stack>

      <ConfirmDialog
        confirmLabel="Encerrar sessão"
        description="O dispositivo selecionado precisará entrar novamente no sistema."
        loading={revokeMutation.isPending}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={() => revokeMutation.mutate(sessionToRevoke.id)}
        open={Boolean(sessionToRevoke)}
        title="Encerrar esta sessão?"
      />
      <ConfirmDialog
        confirmLabel="Sair de todos"
        description="Todas as suas sessões serão encerradas, incluindo esta. Você precisará entrar novamente."
        loading={logoutAllMutation.isPending}
        onClose={() => setLogoutAllOpen(false)}
        onConfirm={() => logoutAllMutation.mutate()}
        open={logoutAllOpen}
        title="Sair de todos os dispositivos?"
      />
      {feedback && (
        <Snackbar autoHideDuration={5000} onClose={() => setFeedback(null)} open>
          <Alert onClose={() => setFeedback(null)} severity={feedback.severity} variant="filled">
            {feedback.message}
            {feedback.requestId && (
              <Typography display="block" variant="caption">
                Referência: {feedback.requestId}
              </Typography>
            )}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
