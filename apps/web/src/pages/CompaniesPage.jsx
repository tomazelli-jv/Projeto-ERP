import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { Alert, Button, Grid, Snackbar, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createLoja, listEmpresas, listLojas, updateEmpresa, updateLoja } from '../api/business.js';
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

const empresasQueryKey = ['empresas'];

// Traduz falhas conhecidas para mensagens úteis sem apresentar códigos internos como texto principal.
function mutationMessage(error) {
  if (error?.code === 'LOJA_DOCUMENTO_ALREADY_EXISTS') return 'Já existe uma loja cadastrada com este CNPJ.';
  return error?.message || 'Não foi possível salvar as alterações. Tente novamente.';
}

// Esta é a primeira página administrativa conectada aos contratos reais de empresa e loja do ERP.
export function CompaniesPage() {
  const queryClient = useQueryClient();
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [lojaDialog, setLojaDialog] = useState({ open: false, loja: null });
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [empresaError, setEmpresaError] = useState('');
  const [lojaError, setLojaError] = useState('');
  const [feedback, setFeedback] = useState('');

  // A consulta inicial diferencia ausência real de registros de ausência de contexto empresarial.
  const empresasQuery = useQuery({ queryKey: empresasQueryKey, queryFn: listEmpresas });
  const empresa = empresasQuery.data?.[0] ?? null;
  const lojasQueryKey = ['empresas', empresa?.id, 'lojas'];

  // A query dependente nunca é executada até existir uma empresa autorizada retornada pela API.
  const lojasQuery = useQuery({
    queryKey: lojasQueryKey,
    queryFn: () => listLojas(empresa.id),
    enabled: Boolean(empresa?.id)
  });

  // Atualizar a empresa invalida sua fonte de verdade e mantém o formulário aberto quando a API rejeita o payload.
  const empresaMutation = useMutation({
    mutationFn: (body) => updateEmpresa(empresa.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: empresasQueryKey });
      setEmpresaDialogOpen(false);
      setEmpresaError('');
      setFeedback('Empresa atualizada com sucesso.');
    },
    onError: (error) => setEmpresaError(mutationMessage(error))
  });

  // Uma única mutation atende cadastro e edição, invalidando somente as lojas da empresa ativa.
  const lojaMutation = useMutation({
    mutationFn: ({ loja, body }) => (loja ? updateLoja(loja.id, body) : createLoja(empresa.id, body)),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: lojasQueryKey });
      setLojaDialog({ open: false, loja: null });
      setLojaError('');
      setFeedback(variables.loja ? 'Loja atualizada com sucesso.' : 'Loja cadastrada com sucesso.');
    },
    onError: (error) => setLojaError(mutationMessage(error))
  });

  // Submissões que mudam um registro ativo para inativo aguardam uma decisão explícita do usuário.
  function submitEmpresa(body) {
    setEmpresaError('');
    if (empresa.ativo && !body.ativo) {
      setPendingConfirmation({ kind: 'empresa', body });
      return;
    }
    empresaMutation.mutate(body);
  }

  // A loja selecionada é preservada junto do payload para que a confirmação use a operação correta.
  function submitLoja(body) {
    setLojaError('');
    if (lojaDialog.loja?.ativo && !body.ativo) {
      setPendingConfirmation({ kind: 'loja', body, loja: lojaDialog.loja });
      return;
    }
    lojaMutation.mutate({ loja: lojaDialog.loja, body });
  }

  // Confirmação reutiliza as mesmas mutations e não cria endpoints paralelos de ativação ou exclusão.
  function confirmInactivation() {
    const pending = pendingConfirmation;
    setPendingConfirmation(null);
    if (pending.kind === 'empresa') empresaMutation.mutate(pending.body);
    else lojaMutation.mutate({ loja: pending.loja, body: pending.body });
  }

  // Loading, erro de contexto, erro inesperado e coleção vazia são estados semanticamente distintos.
  if (empresasQuery.isPending) return <LoadingState message="Carregando empresa..." rows={2} />;
  if (empresasQuery.isError && empresasQuery.error?.code === 'BUSINESS_CONTEXT_REQUIRED') {
    return (
      <>
        <PageHeader
          title="Empresas e lojas"
          description="Gerencie sua empresa e os estabelecimentos vinculados."
        />
        <SectionCard>
          <EmptyState
            icon={BusinessOutlinedIcon}
            title="Acesso empresarial não configurado"
            description="Seu usuário ainda não está vinculado a uma empresa. Solicite ao administrador a configuração do seu acesso."
            action={
              <Button onClick={() => empresasQuery.refetch()} variant="outlined">
                Tentar novamente
              </Button>
            }
          />
        </SectionCard>
      </>
    );
  }
  if (empresasQuery.isError) {
    return (
      <>
        <PageHeader
          title="Empresas e lojas"
          description="Gerencie sua empresa e os estabelecimentos vinculados."
        />
        <SectionCard>
          <ErrorState
            description="Ocorreu uma falha ao consultar sua empresa."
            onRetry={() => empresasQuery.refetch()}
          />
        </SectionCard>
      </>
    );
  }
  if (!empresa) {
    return (
      <>
        <PageHeader
          title="Empresas e lojas"
          description="Gerencie sua empresa e os estabelecimentos vinculados."
        />
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
      <PageHeader
        title="Empresas e lojas"
        description="Gerencie sua empresa e os estabelecimentos vinculados."
      />

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
                {lojasQuery.data?.length ?? 0}{' '}
                {(lojasQuery.data?.length ?? 0) === 1 ? 'loja cadastrada' : 'lojas cadastradas'}
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
          {lojasQuery.isPending && <LoadingState message="Carregando lojas..." rows={2} />}
          {lojasQuery.isError && (
            <ErrorState
              description="Ocorreu uma falha ao consultar as lojas."
              onRetry={() => lojasQuery.refetch()}
            />
          )}
          {lojasQuery.isSuccess && lojasQuery.data.length === 0 && (
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
          {lojasQuery.isSuccess && lojasQuery.data.length > 0 && (
            <Grid container spacing={2.5}>
              {lojasQuery.data.map((loja) => (
                <Grid key={loja.id} size={{ xs: 12, lg: 6 }}>
                  <LojaCard
                    loja={loja}
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
        open={empresaDialogOpen}
        loading={empresaMutation.isPending}
        apiError={empresaError}
        onClose={() => setEmpresaDialogOpen(false)}
        onSubmit={submitEmpresa}
      />
      <LojaFormDialog
        loja={lojaDialog.loja}
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
