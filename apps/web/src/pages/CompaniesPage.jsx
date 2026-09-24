import { CreateButton } from '../components/common/CreateButton.jsx';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import {
  createLoja,
  getEmpresa,
  listEmpresas,
  listLojas,
  updateEmpresa,
  updateLoja
} from '../api/business.js';
import { useAuth } from '../app/auth/auth-context.js';
import { useOperationalContext } from '../app/operational-context/operational-context.js';
import { BusinessProfile } from '../components/business/BusinessProfile.jsx';
import { BusinessFormDialog } from '../components/business/BusinessFormDialog.jsx';
import { LojasTable } from '../components/business/LojasTable.jsx';
import { businessError, businessScope, canManageBusiness } from '../components/business/business-model.js';
import { businessDensitySx } from '../components/business/business-styles.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';

// Guard antes de montar as queries; troca de JWT remonta o estado local sem misturar empresas.
export function CompaniesPage() {
  const { claims } = useAuth();
  const context = useOperationalContext();
  return (
    <Box sx={businessDensitySx}>
      <PageHeader title="Empresas e Lojas" description="Gerencie as lojas vinculadas a cada empresa." />
      {!canManageBusiness(claims) ? (
        <Alert severity="info">Você não possui permissão para acessar Empresas e Lojas.</Alert>
      ) : context.isSwitchingStore ? (
        <BusinessLoading />
      ) : (
        <CompaniesContent key={JSON.stringify(businessScope(claims))} claims={claims} />
      )}
    </Box>
  );
}
function BusinessLoading() {
  return (
    <Stack role="status" aria-label="Carregando empresas e lojas" spacing={2}>
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} variant="rounded" height={100} />
      ))}
    </Stack>
  );
}
function CompaniesContent({ claims }) {
  const queryClient = useQueryClient();
  const scope = businessScope(claims);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const lock = useRef(false);
  const empresas = useQuery({
    queryKey: [...scope, 'companies'],
    queryFn: ({ signal }) => listEmpresas(signal),
    retry: false
  });
  // Preferência pelo contexto atual, depois primeira empresa acessível. Seleção local nunca fabrica JWT.
  const companyId =
    selected ||
    String(
      empresas.data?.find((item) => String(item.id) === String(claims.empresaId))?.id ??
        empresas.data?.[0]?.id ??
        ''
    );
  const company = useQuery({
    queryKey: [...scope, 'company', companyId],
    queryFn: ({ signal }) => getEmpresa(companyId, signal),
    enabled: Boolean(companyId),
    retry: false
  });
  const matchesContext = Boolean(claims.empresaId) && String(claims.empresaId) === companyId;
  // GET Loja não aceita empresaId: só é consultado para a empresa representada no JWT.
  const lojas = useQuery({
    queryKey: [...scope, 'stores', companyId],
    queryFn: ({ signal }) => listLojas(signal),
    enabled: matchesContext && company.isSuccess,
    retry: false
  });
  const rows = (lojas.data ?? []).filter((item) => String(item.empresaId) === companyId);
  // A busca filtra a lista completa já carregada; os indicadores continuam sendo da empresa inteira.
  const visibleRows = rows.filter((item) =>
    (item.nome ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))
  );
  const totalsAvailable = matchesContext && lojas.isSuccess;
  const mutation = useMutation({
    mutationFn: ({ kind, record, body }) =>
      kind === 'empresa'
        ? updateEmpresa(record.id, body)
        : record
          ? updateLoja(record.id, body)
          : createLoja(companyId, body),
    onSuccess: async () => {
      // Invalida só o módulo e o seletor global; não muda activeStore nem limpa cache global.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scope }),
        queryClient.invalidateQueries({ queryKey: ['my-stores', claims.funcionarioId] })
      ]);
      setDialog(null);
      setConfirmation(null);
      setError('');
      setFeedback('Cadastro salvo com sucesso.');
    },
    onError: (cause) => setError(businessError(cause))
  });
  async function save(operation) {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await mutation.mutateAsync(operation);
    } catch {
      /* Erro permanece no dialog para correção sem perder o rascunho. */
    } finally {
      lock.current = false;
    }
  }
  function submit(body) {
    const operation = { kind: dialog.kind, record: dialog.record, body };
    if (dialog.record && dialog.record.ativo !== body.ativo) {
      setConfirmation(operation);
      return;
    }
    return save(operation);
  }
  function open(kind, mode, record = null) {
    setError('');
    setDialog({ kind, mode, record });
  }
  if (empresas.isPending) return <BusinessLoading />;
  if (empresas.isError)
    return <ErrorState description={businessError(empresas.error)} onRetry={() => empresas.refetch()} />;
  if (!empresas.data?.length)
    return (
      <SectionCard>
        <EmptyState
          title="Nenhuma empresa disponível"
          description="Não há empresas acessíveis para este usuário."
        />
      </SectionCard>
    );
  // Perfil ocupa o conteúdo da página, sem modal ou rolagem interna sobre a listagem.
  if (dialog?.mode === 'view')
    return (
      <BusinessProfile
        kind={dialog.kind}
        record={dialog.record}
        companyName={company.data?.nome}
        onClose={() => setDialog(null)}
        onEdit={() => setDialog((previous) => ({ ...previous, mode: 'edit' }))}
      />
    );
  return (
    <Stack spacing={2}>
      {empresas.data.length > 1 && (
        <TextField
          select
          label="Empresa"
          value={companyId}
          onChange={(event) => {
            setSelected(event.target.value);
            setSearch('');
            setDialog(null);
            setConfirmation(null);
          }}
          sx={{ maxWidth: 480 }}
        >
          {empresas.data.map((item) => (
            <MenuItem key={item.id} value={String(item.id)}>
              {item.nome}
            </MenuItem>
          ))}
        </TextField>
      )}
      {company.isPending ? (
        <BusinessLoading />
      ) : company.isError ? (
        <ErrorState description={businessError(company.error)} onRetry={() => company.refetch()} />
      ) : (
        <>
          <SectionCard>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Avatar
                variant="rounded"
                sx={{ width: 48, height: 48, bgcolor: 'surface.secondary', color: 'text.secondary' }}
              >
                <BusinessOutlinedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={2}>
                  <Typography variant="h2" sx={{ overflowWrap: 'anywhere' }}>
                    {company.data.nome}
                  </Typography>
                  <Chip
                    size="small"
                    color={company.data.ativo ? 'success' : 'error'}
                    label={company.data.ativo ? 'Ativa' : 'Inativa'}
                  />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Dados da empresa e suas unidades
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<VisibilityOutlinedIcon />}
                onClick={() => open('empresa', 'view', company.data)}
              >
                Visualizar dados da empresa
              </Button>
            </Stack>
          </SectionCard>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' },
              gap: 2
            }}
          >
            {[
              ['Total de lojas', StorefrontOutlinedIcon, 'info', rows.length],
              [
                'Lojas ativas',
                CheckCircleOutlineIcon,
                'success',
                rows.filter((item) => item.ativo === true).length
              ],
              [
                'Lojas inativas',
                BlockOutlinedIcon,
                'error',
                rows.filter((item) => item.ativo === false).length
              ]
            ].map(([label, Icon, tone, value]) => (
              <Card
                key={label}
                sx={{ borderRadius: 2, bgcolor: tone + '.soft', borderColor: tone + '.main' }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      p: 1.25,
                      borderRadius: 1.5,
                      color: tone + '.main',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={650}>
                      {label}
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 0.5 }}>
                      {totalsAvailable ? value : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {totalsAvailable ? 'Na empresa selecionada' : 'Aguardando consulta das lojas'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            gap={2}
            sx={{ pt: 1 }}
          >
            <TextField
              fullWidth
              label="Buscar loja por nome"
              placeholder="Digite o nome da loja..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!totalsAvailable}
              sx={{ flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }
              }}
            />
            <CreateButton sx={{ flexShrink: 0 }} onClick={() => open('loja', 'edit')}>
              Nova loja
            </CreateButton>
          </Stack>
          {!matchesContext ? (
            <Alert severity="info">
              Para consultar as lojas desta empresa, selecione uma loja dela no seletor global. A consulta de
              lojas usa a empresa da sessão atual.
            </Alert>
          ) : lojas.isPending ? (
            <BusinessLoading />
          ) : lojas.isError ? (
            <ErrorState description={businessError(lojas.error)} onRetry={() => lojas.refetch()} />
          ) : rows.length === 0 ? (
            <SectionCard>
              <EmptyState
                title="Nenhuma loja cadastrada"
                description="Cadastre a primeira loja desta empresa."
                action={<CreateButton onClick={() => open('loja', 'edit')}>Nova loja</CreateButton>}
              />
            </SectionCard>
          ) : visibleRows.length === 0 ? (
            <EmptyState
              title="Nenhuma loja encontrada"
              description="Tente outro nome ou limpe a busca."
              action={<Button onClick={() => setSearch('')}>Limpar busca</Button>}
            />
          ) : (
            <LojasTable
              lojas={visibleRows}
              onEdit={(record) => open('loja', 'edit', record)}
              disabled={mutation.isPending}
              onView={(record) => open('loja', 'view', record)}
              onStatus={(record) => {
                setError('');
                setConfirmation({ kind: 'loja', record, body: { ...record, ativo: !record.ativo } });
              }}
            />
          )}
          {dialog?.mode === 'edit' && (
            <BusinessFormDialog
              key={`${dialog.kind}-${dialog.record?.id ?? 'new'}`}
              kind={dialog.kind}
              record={dialog.record}
              company={company.data}
              loading={mutation.isPending}
              apiError={error}
              onClose={() => setDialog(null)}
              onSubmit={submit}
            />
          )}
        </>
      )}
      {error && confirmation && <Alert severity="error">{error}</Alert>}
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={`${confirmation?.body.ativo ? 'Ativar' : 'Inativar'} ${confirmation?.kind === 'empresa' ? 'empresa' : 'loja'}?`}
        description={
          error ||
          (confirmation?.kind === 'loja' &&
          String(confirmation.record.id) === String(claims.lojaId) &&
          !confirmation.body.ativo
            ? 'Esta é a loja da sessão atual. A alteração será salva; o contexto da sessão não será trocado automaticamente.'
            : 'O cadastro será preservado e sua situação será atualizada.')
        }
        confirmLabel={confirmation?.body.ativo ? 'Ativar' : 'Inativar'}
        loading={mutation.isPending}
        onClose={() => {
          setConfirmation(null);
          setError('');
        }}
        onConfirm={() => save(confirmation)}
      />
      <Snackbar open={Boolean(feedback)} autoHideDuration={5000} onClose={() => setFeedback('')}>
        <Alert severity="success" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
CompaniesContent.propTypes = { claims: PropTypes.object.isRequired };
