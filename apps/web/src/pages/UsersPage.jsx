import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../app/auth/auth-context.js';
import {
  createUserEmployee,
  getUser,
  listBusinessStores,
  listProfiles,
  listUsers,
  updateEmployee,
  updateEmployeeStores,
  updateUser,
  updateUserProfile
} from '../api/users.js';
import { UserAccessDialog } from '../components/users/UserAccessDialog.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';

const usersKey = ['users'];

// Mensagens traduzem conflitos oficiais sem transformar 403 em estado vazio.
function errorMessage(error) {
  const known = {
    USUARIO_EMAIL_ALREADY_EXISTS: 'Já existe um usuário com este e-mail.',
    USUARIO_USERNAME_ALREADY_EXISTS: 'Já existe um usuário com este nome de usuário.',
    LAST_ADMINISTRATOR_REQUIRED: 'A empresa precisa manter pelo menos um administrador ativo.',
    SELF_DEACTIVATION_FORBIDDEN: 'Você não pode inativar sua própria conta.',
    LOJA_OUTSIDE_BUSINESS_CONTEXT: 'Uma das lojas selecionadas não está disponível.'
  };
  return known[error?.code] ?? error?.message ?? 'Não foi possível salvar as alterações.';
}

// Página usa cards responsivos para manter leitura confortável sem overflow horizontal em celulares.
export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, id: null });
  const [pending, setPending] = useState(null);
  const [apiError, setApiError] = useState('');
  const [feedback, setFeedback] = useState('');

  const usersQuery = useQuery({ queryKey: usersKey, queryFn: listUsers });
  const profilesQuery = useQuery({ queryKey: ['profiles'], queryFn: listProfiles });
  const storesQuery = useQuery({ queryKey: ['business-stores'], queryFn: listBusinessStores });
  const detailQuery = useQuery({
    queryKey: ['users', dialog.id],
    queryFn: () => getUser(dialog.id),
    enabled: Boolean(dialog.id)
  });

  // Uma mutation compõe endpoints especializados; cada resposta concluída invalida somente dados relacionados.
  const saveMutation = useMutation({
    mutationFn: async (form) => {
      if (!dialog.id)
        return createUserEmployee({
          userName: form.userName,
          email: form.email,
          password: form.password,
          nomeFuncionario: form.nomeFuncionario,
          ativo: form.ativo,
          idPerfil: form.idPerfil,
          idsLojas: form.idsLojas
        });
      const detail = detailQuery.data;
      await updateUser(detail.idUsuario, { userName: form.userName, email: form.email, ativo: form.ativo });
      await updateEmployee(detail.funcionario.idFuncionario, { nome: form.nomeFuncionario });
      await updateUserProfile(detail.idUsuario, { idPerfil: form.idPerfil });
      await updateEmployeeStores(detail.funcionario.idFuncionario, { idsLojas: form.idsLojas });
      return getUser(detail.idUsuario);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersKey });
      setDialog({ open: false, id: null });
      setApiError('');
      setFeedback(dialog.id ? 'Acessos atualizados com sucesso.' : 'Funcionário criado com sucesso.');
    },
    onError: (error) => setApiError(errorMessage(error))
  });

  // Inativação exige confirmação explícita; auto-inativação também permanece bloqueada no servidor.
  function submit(form) {
    setApiError('');
    if (detailQuery.data?.ativo && !form.ativo) return setPending(form);
    saveMutation.mutate(form);
  }

  const loadingOptions =
    profilesQuery.isPending || storesQuery.isPending || (dialog.id && detailQuery.isPending);
  if (usersQuery.isPending) return <LoadingState message="Carregando usuários..." rows={3} />;
  if (usersQuery.isError)
    return <ErrorState description={errorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} />;

  return (
    <>
      <PageHeader
        title="Usuários e funcionários"
        description="Gerencie pessoas, acessos e lojas disponíveis."
      />
      <Stack alignItems={{ xs: 'stretch', sm: 'flex-end' }} mb={3}>
        <Button
          startIcon={<AddOutlinedIcon />}
          variant="contained"
          onClick={() => {
            setApiError('');
            setDialog({ open: true, id: null });
          }}
        >
          Novo funcionário
        </Button>
      </Stack>
      {usersQuery.data.length === 0 ? (
        <EmptyState
          icon={ManageAccountsOutlinedIcon}
          title="Nenhum usuário disponível"
          description="Cadastre o primeiro funcionário com acesso ao sistema."
        />
      ) : (
        <Grid container spacing={2.5}>
          {usersQuery.data.map((item) => (
            <Grid key={item.idUsuario} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Typography component="h2" fontWeight={700} variant="h6">
                      {item.nomeFuncionario}
                    </Typography>
                    <Chip
                      color={item.ativo ? 'success' : 'default'}
                      label={item.ativo ? 'Ativo' : 'Inativo'}
                      size="small"
                    />
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {item.email}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    @{item.userName}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
                    <Chip label={item.perfil ?? 'Sem perfil'} size="small" variant="outlined" />
                    <Chip
                      label={`${item.quantidadeLojas} ${item.quantidadeLojas === 1 ? 'loja' : 'lojas'}`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button
                    onClick={() => {
                      setApiError('');
                      setDialog({ open: true, id: item.idUsuario });
                    }}
                  >
                    Editar acesso
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {dialog.open && !loadingOptions && (
        <UserAccessDialog
          open
          user={dialog.id ? detailQuery.data : null}
          currentUserId={currentUser?.id}
          profiles={profilesQuery.data ?? []}
          stores={storesQuery.data ?? []}
          loading={saveMutation.isPending}
          apiError={apiError}
          onClose={() => setDialog({ open: false, id: null })}
          onSubmit={submit}
        />
      )}
      {dialog.open && loadingOptions && <Alert severity="info">Carregando dados do formulário...</Alert>}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Inativar este usuário?"
        description="O usuário não poderá mais acessar o sistema e suas sessões ativas serão encerradas."
        confirmLabel="Inativar"
        loading={saveMutation.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const form = pending;
          setPending(null);
          saveMutation.mutate(form);
        }}
      />
      <Snackbar open={Boolean(feedback)} autoHideDuration={5000} onClose={() => setFeedback('')}>
        <Alert severity="success" variant="filled" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </>
  );
}
