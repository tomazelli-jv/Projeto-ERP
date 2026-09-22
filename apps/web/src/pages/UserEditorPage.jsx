import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Avatar,
  Divider,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { usersApi } from '../api/users.js';
import { useAuth } from '../app/auth/auth-context.js';
import { useOperationalContext } from '../app/operational-context/operational-context.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { UserProfile } from '../components/users/UserProfile.jsx';
import {
  userError,
  userPermissions,
  userProfiles,
  userQueryScope,
  validateUserForm
} from '../components/users/user-model.js';

// Detalhe e edição compartilham os campos reais; nenhuma inferência de perfil ou loja por vínculo.
export function UserEditorPage({ mode }) {
  const { id } = useParams();
  const { claims } = useAuth();
  const context = useOperationalContext();
  const permissions = userPermissions(claims);
  const creating = mode === 'create';
  const allowed = creating ? permissions.create : permissions.view && (mode !== 'edit' || permissions.update);
  const scope = userQueryScope(claims);
  const validId = creating || /^[1-9]\d*$/.test(id ?? '');
  const query = useQuery({
    queryKey: [...scope, 'detail', id],
    queryFn: ({ signal }) => usersApi.getById(id, signal),
    enabled: !creating && allowed && validId && Boolean(claims?.empresaId) && !context.isSwitchingStore,
    retry: false
  });
  const title = creating ? 'Criar usuário' : mode === 'edit' ? 'Editar usuário' : 'Perfil do colaborador';
  return (
    <>
      <PageHeader
        title={title}
        titleBadge={
          creating ? (
            <Chip label="Novo cadastro" color="primary" size="small" variant="outlined" />
          ) : undefined
        }
        description={
          creating
            ? 'Preencha os dados abaixo para cadastrar um novo usuário no sistema.'
            : 'Consulte os dados de identificação e acesso do usuário.'
        }
        action={
          <Button component={Link} to="/admin/users" variant="outlined" startIcon={<ArrowBackIcon />}>
            Voltar para a lista
          </Button>
        }
      />
      {!allowed ? (
        <Alert severity="info">Você não possui permissão para esta operação.</Alert>
      ) : !validId ? (
        <Alert severity="error">Usuário inválido.</Alert>
      ) : !claims?.empresaId ? (
        <Alert severity="info">Selecione um contexto de empresa e loja.</Alert>
      ) : context.isSwitchingStore || (!creating && query.isPending) ? (
        <LoadingState message="Carregando usuário..." />
      ) : query.isError ? (
        <ErrorState description={userError(query.error)} onRetry={() => query.refetch()} />
      ) : mode === 'view' ? (
        <UserProfile user={query.data} canEdit={permissions.update} />
      ) : (
        <UserForm
          key={JSON.stringify([...scope, id, mode])}
          mode={mode}
          initial={creating ? null : query.data}
          scope={scope}
          context={context}
          canEdit={permissions.update}
        />
      )}
    </>
  );
}
UserEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };

function UserForm({ mode, initial, scope, context, canEdit }) {
  const creating = mode === 'create',
    readonly = mode === 'view';
  const [form, setForm] = useState(() => ({
    nome: initial?.nome ?? '',
    userName: initial?.userName ?? '',
    email: initial?.email ?? '',
    ativo: initial?.ativo ?? true,
    senha: '',
    confirmacao: '',
    tipoUsuario: '',
    idLoja: ''
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate(),
    queryClient = useQueryClient();
  const mounted = useRef(true);
  // Trava síncrona cobre dois cliques no mesmo frame antes de isPending renderizar.
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Mutation sem variables evita senha no cache; invalidação restrita ao módulo/contexto.
  const mutation = useMutation({
    mutationFn: () => (creating ? usersApi.create(form) : usersApi.update(initial.id, form)),
    gcTime: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scope });
      if (mounted.current) {
        setForm((old) => ({ ...old, senha: '', confirmacao: '' }));
        navigate('/admin/users', {
          state: {
            userFeedback: creating ? 'Usuário criado com sucesso.' : 'Usuário atualizado com sucesso.'
          }
        });
      }
    },
    onError: (err) => {
      if (mounted.current) setError(userError(err));
    },
    onSettled: () => {
      submitting.current = false;
    }
  });
  const set = (field) => (event) => setForm((old) => ({ ...old, [field]: event.target.value }));
  const stores = context.stores.filter((store) => store.ativo && store.empresaId === context.company?.id);
  const companyName = context.company?.nome ?? `Empresa ${context.company?.id}`;
  const store = stores.find((item) => item.id === String(form.idLoja));
  function submit(event) {
    event.preventDefault();
    if (submitting.current || mutation.isPending || readonly) return;
    const message = validateUserForm(form, creating);
    if (message) {
      setError(message);
      return;
    }
    if (creating && !stores.some((item) => item.id === String(form.idLoja))) {
      setError('Selecione uma loja disponível.');
      return;
    }
    setError('');
    submitting.current = true;
    mutation.mutate();
  }
  // Labels externos e adornos seguem a referencia; regras e payloads continuam nos handlers existentes.
  const fieldInput = (Icon) => ({
    readOnly: readonly,
    startAdornment: (
      <InputAdornment position="start">
        <Icon fontSize="small" />
      </InputAdornment>
    )
  });
  const sectionStyle = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      bgcolor: 'divider'
    },
    '& .MuiCardContent-root > .MuiStack-root:first-of-type .MuiSvgIcon-root': {
      boxSizing: 'content-box',
      p: 1.25,
      borderRadius: 1.5,
      bgcolor: 'surface.secondary'
    }
  };
  const disabled = mutation.isPending;
  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{
        // Estilo limitado ao editor: nao muda labels de busca, seletor global ou outros formularios.
        '& .MuiTextField-root .MuiInputLabel-root': {
          position: 'static',
          transform: 'none',
          mb: 0.75,
          maxWidth: '100%',
          fontSize: 13,
          color: 'text.secondary'
        },
        '& .MuiInputLabel-asterisk': { color: 'text.secondary' },
        '& .MuiOutlinedInput-root': { minHeight: 48, bgcolor: 'background.default' },
        '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
        '& .MuiOutlinedInput-notchedOutline': { top: 0 },
        '& .MuiFormHelperText-root': { mx: 0 }
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* Mesmo grid e tokens nos dois temas; resumo desce abaixo da coluna principal no tablet. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1.7fr) minmax(300px,1fr)' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack spacing={3}>
          <SectionCard
            sx={sectionStyle}
            icon={PersonOutlineIcon}
            title="Dados do usuário"
            subtitle="Informações básicas para identificação e acesso."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
                gap: 2.5
              }}
            >
              <TextField
                required={!readonly}
                placeholder="Ex.: Ana Beatriz Souza"
                label="Nome completo"
                value={form.nome}
                onChange={set('nome')}
                disabled={disabled}
                slotProps={{ input: fieldInput(PersonOutlineIcon) }}
              />
              <TextField
                required={!readonly}
                placeholder="nome@empresa.com.br"
                label="E-mail"
                type="email"
                value={form.email}
                onChange={set('email')}
                disabled={disabled}
                slotProps={{ input: fieldInput(MailOutlineIcon) }}
              />
              <TextField
                required={!readonly}
                placeholder="ana.souza"
                label="Usuário (login)"
                autoComplete="off"
                value={form.userName}
                onChange={set('userName')}
                disabled={disabled}
                slotProps={{ input: fieldInput(AlternateEmailIcon) }}
              />
              {creating && (
                <>
                  <TextField
                    required
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.senha}
                    onChange={set('senha')}
                    disabled={disabled}
                    helperText="Ao menos 6 caracteres, com maiúscula, minúscula e número."
                    slotProps={{
                      input: {
                        ...fieldInput(LockOutlinedIcon),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                              onClick={() => setShowPassword((old) => !old)}
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                  <TextField
                    required
                    label="Confirmar senha"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirmacao}
                    onChange={set('confirmacao')}
                    slotProps={{ input: fieldInput(LockOutlinedIcon) }}
                    disabled={disabled}
                  />
                </>
              )}
            </Box>
          </SectionCard>
          <SectionCard
            sx={sectionStyle}
            icon={SecurityIcon}
            title="Vínculo e acesso"
            subtitle={
              creating
                ? 'Defina a loja e o perfil de acesso na empresa atual.'
                : 'Status de acesso do usuário.'
            }
          >
            {creating ? (
              <Stack spacing={2.5}>
                <TextField
                  label="Empresa atual"
                  value={companyName}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'surface.secondary' } }}
                  slotProps={{
                    input: {
                      ...fieldInput(BusinessOutlinedIcon),
                      readOnly: true,
                      endAdornment: (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
                        >
                          fixo pelo ambiente
                        </Typography>
                      )
                    }
                  }}
                />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
                    gap: 2.5
                  }}
                >
                  {context.error ? (
                    <ErrorState description="Não foi possível carregar as lojas." onRetry={context.retry} />
                  ) : (
                    <TextField
                      required
                      select
                      slotProps={{ input: fieldInput(StorefrontOutlinedIcon) }}
                      label="Loja"
                      value={form.idLoja}
                      onChange={set('idLoja')}
                      disabled={context.isLoading || disabled}
                    >
                      {stores.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.nomeFantasia}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {!context.isLoading && !context.error && !stores.length && (
                    <Alert severity="info">Nenhuma loja disponível para criar o usuário.</Alert>
                  )}
                  <TextField
                    required
                    select
                    slotProps={{ input: fieldInput(SecurityIcon) }}
                    label="Perfil de acesso"
                    value={form.tipoUsuario}
                    onChange={set('tipoUsuario')}
                    disabled={disabled}
                  >
                    {userProfiles.map((profile) => (
                      <MenuItem key={profile.value} value={profile.value}>
                        {profile.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">Status após criação</Typography>
                  <Chip icon={<CheckCircleOutlineIcon />} label="Ativo" size="small" color="success" />
                </Stack>
              </Stack>
            ) : readonly ? (
              <Stack spacing={1}>
                <Chip
                  sx={{ alignSelf: 'flex-start' }}
                  label={form.ativo ? 'Ativo' : 'Inativo'}
                  color={form.ativo ? 'success' : 'error'}
                />
                <Typography variant="body2" color="text.secondary">
                  {initial.vinculoIds.length} vínculo(s) de loja
                </Typography>
              </Stack>
            ) : (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ativo}
                    onChange={(event) => setForm((old) => ({ ...old, ativo: event.target.checked }))}
                    disabled={disabled}
                  />
                }
                label="Usuário ativo"
              />
            )}
          </SectionCard>
        </Stack>
        <Stack spacing={2}>
          <SectionCard sx={{ borderRadius: 2 }}>
            <Stack alignItems="center" spacing={1} sx={{ pb: 3 }}>
              <Avatar
                sx={{ width: 72, height: 72, bgcolor: 'surface.secondary', color: 'text.secondary', mb: 1 }}
              >
                <PersonOutlineIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h3">
                {form.nome || (creating ? 'Novo usuário' : 'Resumo do usuário')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resumo do cadastro
              </Typography>
            </Stack>
            <Divider />
            <Stack spacing={2.5} sx={{ py: 3 }}>
              {[
                [PersonOutlineIcon, 'Nome', form.nome],
                [MailOutlineIcon, 'E-mail', form.email],
                [AlternateEmailIcon, 'Usuário', form.userName]
              ].map(([Icon, label, value]) => (
                <Stack key={label} direction="row" spacing={1.5} alignItems="center">
                  <Icon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
            {creating && (
              <>
                <Divider />
                <Stack spacing={2.5} sx={{ py: 3 }}>
                  {[
                    [BusinessOutlinedIcon, 'Empresa', companyName],
                    [StorefrontOutlinedIcon, 'Loja', store?.nomeFantasia],
                    [
                      SecurityIcon,
                      'Perfil',
                      userProfiles.find((profile) => profile.value === Number(form.tipoUsuario))?.label
                    ]
                  ].map(([Icon, label, value]) => (
                    <Stack key={label} direction="row" spacing={1.5} alignItems="center">
                      <Icon
                        fontSize="small"
                        sx={{ color: label === 'Empresa' ? 'primary.dark' : 'text.disabled' }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography sx={{ overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CheckCircleOutlineIcon color={form.ativo ? 'success' : 'error'} fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
              </Stack>
              <Chip
                size="small"
                color={form.ativo ? 'success' : 'error'}
                label={form.ativo ? 'Ativo' : 'Inativo'}
              />
            </Stack>
          </SectionCard>
          {creating && (
            <Alert
              severity="info"
              sx={{
                bgcolor: 'surface.secondary',
                borderColor: 'divider',
                borderLeft: 3,
                borderLeftColor: 'primary.main',
                borderRadius: 2,
                p: 2,
                '& .MuiAlert-icon': { color: 'text.secondary' }
              }}
            >
              Após a criação, o usuário poderá acessar o sistema com as credenciais definidas, conforme as
              permissões atribuídas.
            </Alert>
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="flex-end"
          sx={{ gridColumn: '1 / -1', '& .MuiButton-root': { minHeight: 48, px: 3 } }}
        >
          <Button component={Link} to="/admin/users" variant="outlined" disabled={disabled}>
            {readonly ? 'Voltar' : 'Cancelar'}
          </Button>
          {readonly ? (
            canEdit && (
              <Button component={Link} to={`/admin/users/${initial.id}/edit`} variant="contained">
                Editar usuário
              </Button>
            )
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={
                disabled || (creating && (context.isLoading || Boolean(context.error) || !stores.length))
              }
              startIcon={
                disabled ? (
                  <CircularProgress size={16} color="inherit" />
                ) : creating ? (
                  <PersonAddAltIcon />
                ) : undefined
              }
            >
              {disabled ? 'Salvando...' : creating ? 'Criar usuário' : 'Salvar alterações'}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
UserForm.propTypes = {
  mode: PropTypes.string.isRequired,
  initial: PropTypes.object,
  scope: PropTypes.array.isRequired,
  context: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired
};
