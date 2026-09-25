import { Link, useParams } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { LoadingState } from '../../components/feedback/LoadingState.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { useEntityModule } from './entity-module.js';
import { useEntityDetail } from './entity-queries.js';
import { EntityDemoNotice } from './EntityShared.jsx';
import { EntityStepForm } from './EntityStepForm.jsx';
import { EntityDetail } from './EntityDetail.jsx';
// Rotas distintas compartilham o mesmo editor; trocar o id remonta o rascunho, não o cache global.
export function EntityEditorPage({ mode }) {
  const module = useEntityModule();
  const { id } = useParams();
  const query = useEntityDetail(mode === 'create' ? null : id);
  // O editor de Clientes usa um cabecalho compacto para priorizar os campos.
  const compactHeader = mode !== 'view';
  const title =
    mode === 'create'
      ? `Cadastrar ${module.singular}`
      : mode === 'edit'
        ? `Editar ${module.singular}`
        : `Perfil do ${module.singular}`;
  return (
    <>
      {compactHeader ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
          <Typography component="h1" variant="h3">
            {module.Plural.toUpperCase()}
          </Typography>
          <Button component={Link} to={module.path} startIcon={<ArrowBackIcon />} variant="outlined">
            Voltar para a lista
          </Button>
        </Stack>
      ) : (
        <PageHeader
          title={title}
          description={
            mode === 'create'
              ? `Preencha os dados para cadastrar um novo ${module.singular}.`
              : `Consulte os dados de identificação e contato do ${module.singular}.`
          }
          action={
            <Button component={Link} to={module.path} startIcon={<ArrowBackIcon />} variant="outlined">
              Voltar para a lista
            </Button>
          }
        />
      )}
      {!import.meta.env.DEV ? (
        <Alert severity="info">{`${module.Plural} aguarda integração com o backend.`}</Alert>
      ) : (
        <>
          {!compactHeader && <EntityDemoNotice />}
          {mode !== 'create' && query.isPending ? (
            <LoadingState message={`Carregando ${module.singular}...`} />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : mode !== 'create' && !query.data ? (
            <EmptyState
              title={`${module.Singular} não encontrado.`}
              description="O cadastro não está disponível neste contexto."
              action={
                <Button component={Link} to={module.path}>
                  Voltar para a lista
                </Button>
              }
            />
          ) : mode === 'view' ? (
            <EntityDetail key={id} customer={query.data} />
          ) : (
            <>
              <EntityStepForm key={id ?? 'new'} initial={mode === 'create' ? null : query.data} />
              <EntityDemoNotice />
            </>
          )}
        </>
      )}
    </>
  );
}
EntityEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
