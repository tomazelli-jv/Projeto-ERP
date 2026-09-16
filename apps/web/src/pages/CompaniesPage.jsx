import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { Alert, Button, Grid, Snackbar, Stack, Typography, MenuItem, TextField } from '@mui/material';
import PropTypes from 'prop-types';
import { useBusiness, useCompanies } from '../hooks/useBusiness.js';
import { useAuth } from '../app/auth/auth-context.js';
import { useState } from 'react';
import { EmpresaFormDialog } from '../components/business/EmpresaFormDialog.jsx';
import { LojaCard } from '../components/business/LojaCard.jsx';
import { LojaFormDialog } from '../components/business/LojaFormDialog.jsx';
import { formatDate } from '../components/business/business-formatters.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { StatusChip } from '../components/common/StatusChip.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';

// Traduz falhas conhecidas para mensagens úteis sem apresentar códigos internos como texto principal.
function mutationMessage(error) {
  if (error?.status === 403) return 'Você não tem permissão para esta operação.';
  if (error?.status === 400)
    return 'Confira os dados informados, incluindo documento, tipo de pessoa e campos obrigatórios.';
  if (error?.status === 409) return 'Já existe um cadastro com os dados informados.';
  if (error?.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error?.status === 404) return 'Cadastro não encontrado. Atualize a listagem.';
  if (!error?.status || error.status >= 500) return 'Serviço indisponível. Tente novamente em instantes.';
  return error?.message || 'Não foi possível salvar as alterações. Tente novamente.';
}

// Esta é a primeira página administrativa conectada aos contratos reais de empresa e loja do ERP.
function CompaniesView({ selectedCompanyId }) {
  const { claims } = useAuth();
  const {
    canListStores,
    allowed,
    empresaId,
    empresaQuery: empresasQuery,
    lojasQuery,
    empresaMutation,
    lojaMutation
  } = useBusiness(selectedCompanyId);
  const empresa = empresasQuery.data ?? null;
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [lojaDialog, setLojaDialog] = useState({ open: false, loja: null });
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [empresaError, setEmpresaError] = useState('');
  const [lojaError, setLojaError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Callbacks de tela só executam enquanto este contexto está montado; o hook mantém a invalidação do cache.
  function saveEmpresa(body) {
    empresaMutation.mutate(body, {
      onSuccess: () => {
        setEmpresaDialogOpen(false);
        setEmpresaError('');
        setFeedback('Empresa atualizada com sucesso.');
      },
      onError: (error) => setEmpresaError(mutationMessage(error))
    });
  }
  function saveLoja(variables) {
    lojaMutation.mutate(variables, {
      onSuccess: () => {
        setLojaDialog({ open: false, loja: null });
        setLojaError('');
        setFeedback('Loja salva com sucesso.');
      },
      onError: (error) => setLojaError(mutationMessage(error))
    });
  }

  // Submissões que mudam um registro ativo para inativo aguardam uma decisão explícita do usuário.
  function submitEmpresa(body) {
    setEmpresaError('');
    if (empresa.ativo && !body.ativo) {
      setPendingConfirmation({ kind: 'empresa', body });
      return;
    }
    saveEmpresa(body);
  }

  // A loja selecionada é preservada junto do payload para que a confirmação use a operação correta.
  function submitLoja(body) {
    setLojaError('');
    if (lojaDialog.loja?.ativo && !body.ativo) {
      setPendingConfirmation({ kind: 'loja', body, loja: lojaDialog.loja });
      return;
    }
    saveLoja({ loja: lojaDialog.loja, body });
  }

  // Confirmação reutiliza as mesmas mutations e não cria endpoints paralelos de ativação ou exclusão.
  function confirmInactivation() {
    const pending = pendingConfirmation;
    setPendingConfirmation(null);
    if (pending.kind === 'empresa') saveEmpresa(pending.body);
    else saveLoja({ loja: pending.loja, body: pending.body });
  }

  // As rotas atuais exigem Administrador e contexto empresarial; não emitir requests sem ambos.
  if (!allowed || !empresaId)
    return (
      <>
        <Alert severity="info">
          {!allowed
            ? 'Seu acesso não permite gerenciar empresas e lojas. Solicite acesso ao administrador.'
            : 'Sua sessão não possui empresa vinculada. Solicite a configuração do acesso.'}
        </Alert>
      </>
    );

  // Loading, erro de contexto, erro inesperado e coleção vazia são estados semanticamente distintos.
  if (empresasQuery.isPending) return <LoadingState message="Carregando empresa..." rows={2} />;
  if (empresasQuery.isError) {
    return (
      <>
        <SectionCard>
          <ErrorState
            description={
              empresasQuery.error?.status === 403
                ? 'Você não tem permissão para consultar esta empresa.'
                : empresasQuery.error?.status === 404
                  ? 'Empresa não encontrada.'
                  : 'Ocorreu uma falha ao consultar sua empresa.'
            }
            onRetry={() => empresasQuery.refetch()}
          />
        </SectionCard>
      </>
    );
  }
  if (!empresa) {
    return (
      <>
        <SectionCard>
          <EmptyState
            icon={BusinessOutlinedIcon}
            title="Nenhuma empresa disponível"
            description="Não há uma empresa acessível para este usuário."
          />
        </SectionCard>
      </>
    );
  }

  return (
    <>
      {/* Um card único concentra os dados institucionais e evita fragmentar excessivamente a página. */}
      <SectionCard title="Informações da empresa">
        <Stack spacing={3}>
          <Stack
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            direction={{ xs: 'column', sm: 'row' }}
            gap={1.5}
            justifyContent="space-between"
          >
            <Typography component="h2" variant="h2">
              {empresa.nome}
            </Typography>
            <StatusChip
              label={empresa.ativo ? 'Ativa' : 'Inativa'}
              status={empresa.ativo ? 'active' : 'inactive'}
            />
          </Stack>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography color="text.secondary" variant="caption">
                Nome
              </Typography>
              <Typography>{empresa.nome}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Typography color="text.secondary" variant="caption">
                Situação
              </Typography>
              <Typography>{empresa.ativo ? 'Ativa' : 'Inativa'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Typography color="text.secondary" variant="caption">
                Cadastrada em
              </Typography>
              <Typography>{formatDate(empresa.dataCadastro)}</Typography>
            </Grid>
          </Grid>
          <Button
            onClick={() => {
              setEmpresaError('');
              setEmpresaDialogOpen(true);
            }}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
            variant="outlined"
          >
            Editar empresa
          </Button>
        </Stack>
      </SectionCard>

      {/* A seção de lojas ocupa toda a largura, com ação acessível também no estado vazio. */}
      <SectionCard sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          <Stack
            alignItems={{ xs: 'stretch', sm: 'center' }}
            direction={{ xs: 'column', sm: 'row' }}
            gap={2}
            justifyContent="space-between"
          >
            <div>
              <Typography component="h2" variant="h3">
                Lojas
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {canListStores
                  ? `${lojasQuery.data?.length ?? 0} lojas cadastradas`
                  : 'Consulta de lojas indisponível para esta empresa'}
              </Typography>
            </div>
            <Button
              startIcon={<AddOutlinedIcon />}
              onClick={() => {
                setLojaError('');
                setLojaDialog({ open: true, loja: null });
              }}
              variant="contained"
            >
              Nova loja
            </Button>
          </Stack>
          {!canListStores && (
            <Alert severity="info">
              A consulta de lojas desta empresa ainda não está disponível para sua sessão. Você pode cadastrar
              uma loja, mas a listagem depende de uma atualização do serviço.
            </Alert>
          )}
          {canListStores && lojasQuery.isPending && <LoadingState message="Carregando lojas..." rows={2} />}
          {canListStores && lojasQuery.isError && (
            <ErrorState
              description="Ocorreu uma falha ao consultar as lojas."
              onRetry={() => lojasQuery.refetch()}
            />
          )}
          {canListStores && lojasQuery.isSuccess && lojasQuery.data.length === 0 && (
            <EmptyState
              title="Nenhuma loja cadastrada"
              description="Cadastre o primeiro estabelecimento vinculado a esta empresa."
              action={
                <Button onClick={() => setLojaDialog({ open: true, loja: null })} variant="outlined">
                  Cadastrar loja
                </Button>
              }
            />
          )}
          {canListStores && lojasQuery.isSuccess && lojasQuery.data.length > 0 && (
            <Grid container spacing={2.5}>
              {lojasQuery.data.map((loja) => (
                <Grid key={loja.id} size={{ xs: 12, lg: 6 }}>
                  <LojaCard
                    loja={loja}
                    active={String(loja.id) === String(claims?.lojaId)}
                    onEdit={(selected) => {
                      setLojaError('');
                      setLojaDialog({ open: true, loja: selected });
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </SectionCard>

      <EmpresaFormDialog
        empresa={empresa}
        disableStatus={Boolean(claims?.empresaId) && String(empresa.id) === String(claims.empresaId)}
        open={empresaDialogOpen}
        loading={empresaMutation.isPending}
        apiError={empresaError}
        onClose={() => setEmpresaDialogOpen(false)}
        onSubmit={submitEmpresa}
      />
      <LojaFormDialog
        loja={lojaDialog.loja}
        disableStatus={String(lojaDialog.loja?.id) === String(claims?.lojaId)}
        open={lojaDialog.open}
        loading={lojaMutation.isPending}
        apiError={lojaError}
        onClose={() => setLojaDialog({ open: false, loja: null })}
        onSubmit={submitLoja}
      />
      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.kind === 'empresa' ? 'Inativar esta empresa?' : 'Inativar esta loja?'}
        description="O cadastro será preservado, mas ficará inativo até uma nova alteração de status."
        confirmLabel="Inativar"
        loading={empresaMutation.isPending || lojaMutation.isPending}
        onClose={() => setPendingConfirmation(null)}
        onConfirm={confirmInactivation}
      />
      {/* Snackbar fornece retorno não bloqueante e aria-live após cada mutation concluída. */}
      <Snackbar
        autoHideDuration={5000}
        open={Boolean(feedback)}
        onClose={() => setFeedback('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </>
  );
}

CompaniesView.propTypes = {
  selectedCompanyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

// A sessão remonta toda a gestão; trocar empresa administrativa remonta apenas detalhes e rascunhos.
export function CompaniesPage() {
  const { claims } = useAuth();
  return <CompanyManagement key={[claims?.sub, claims?.sid].join(':')} />;
}
function CompanyManagement() {
  const { allowed, empresaId, query, create } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const companies = query.data ?? [];
  // A preferência do JWT só é usada se constar na lista autorizada; nunca modifica o contexto operacional.
  const selected =
    companies.find((c) => String(c.id) === String(selectedCompanyId)) ??
    companies.find((c) => String(c.id) === String(empresaId)) ??
    companies[0];
  function submit(body) {
    if (create.isPending) return;
    create.mutate(body, {
      onSuccess: (company) => {
        setSelectedCompanyId(company.id);
        setOpen(false);
        setFeedback('Empresa cadastrada com sucesso.');
      }
    });
  }
  const openCreate = () => {
    create.reset();
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="Empresas e lojas"
        description="Gerencie as empresas cadastradas e suas unidades."
        action={
          allowed ? (
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
              Nova empresa
            </Button>
          ) : undefined
        }
      />
      {!allowed ? (
        <Alert severity="info">Você não possui permissão para administrar empresas e lojas.</Alert>
      ) : (
        <>
          {query.isPending && <LoadingState message="Carregando empresas..." rows={2} />}
          {query.isError && (
            <ErrorState description={mutationMessage(query.error)} onRetry={() => query.refetch()} />
          )}
          {query.isSuccess && companies.length === 0 && (
            <EmptyState
              title="Nenhuma empresa cadastrada"
              description="Cadastre a primeira empresa para começar a configurar suas lojas."
              action={
                <Button variant="contained" onClick={openCreate}>
                  Cadastrar primeira empresa
                </Button>
              }
            />
          )}
          {query.isSuccess && selected && (
            <>
              <TextField
                select
                fullWidth
                label="Empresa administrada"
                value={String(selected.id)}
                sx={{ mb: 3 }}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setOpen(false);
                  create.reset();
                }}
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.nome} · {c.ativo ? 'Ativa' : 'Inativa'}
                  </MenuItem>
                ))}
              </TextField>
              <CompaniesView key={String(selected.id)} selectedCompanyId={selected.id} />
            </>
          )}
          <EmpresaFormDialog
            open={open}
            loading={create.isPending}
            apiError={create.error ? mutationMessage(create.error) : ''}
            onClose={() => setOpen(false)}
            onSubmit={submit}
          />
        </>
      )}
      <Snackbar open={Boolean(feedback)} autoHideDuration={5000} onClose={() => setFeedback('')}>
        <Alert severity="success" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </>
  );
}
