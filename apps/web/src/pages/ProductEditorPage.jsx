import { Link, useParams } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Box, Button, Skeleton, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { EntityModuleContext } from '../features/parties/entity-module.js';
import { useEntityDetail } from '../features/parties/entity-queries.js';
import { productModule } from '../features/products/product-module.js';
import { ProductProfile } from '../features/products/ProductProfile.jsx';
import { ProductStepForm } from '../features/products/ProductStepForm.jsx';
// Catálogo único: o formulário muda somente as seções do tipo, mantendo preço/código em ambos.
export function ProductEditorPage({ mode }) {
  return (
    <EntityModuleContext.Provider value={productModule}>
      <Editor mode={mode} />
    </EntityModuleContext.Provider>
  );
}
ProductEditorPage.propTypes = { mode: PropTypes.oneOf(['create', 'edit', 'view']).isRequired };
function Editor({ mode }) {
  const { id } = useParams();
  const query = useEntityDetail(mode === 'create' ? null : id);
  return (
    <Box
      sx={
        mode === 'view'
          ? { maxWidth: 1120, mx: 'auto', '& h1': { fontSize: 26, fontWeight: 650 } }
          : undefined
      }
    >
      {mode === 'view' && (
        <PageHeader
          title="Detalhes do item"
          breadcrumbs={['Produtos', 'Detalhes do item']}
          description="Visualize informações gerais, estoque e tributação do produto ou serviço."
          action={
            <Button component={Link} to="/products" variant="outlined" startIcon={<ArrowBackIcon />}>
              Voltar para a lista
            </Button>
          }
        />
      )}
      {!import.meta.env.DEV ? (
        <Alert severity="info">Catálogo aguarda integração com o backend.</Alert>
      ) : (
        <>
          {mode !== 'create' && query.isPending ? (
            mode === 'view' ? (
              // Esqueleto mantém a hierarquia do perfil enquanto a consulta resolve.
              <Stack spacing={2} role="status" aria-label="Carregando item">
                <Skeleton variant="rounded" height={104} />
                <Skeleton variant="rounded" height={48} />
                <Skeleton variant="rounded" height={300} />
              </Stack>
            ) : (
              <LoadingState message="Carregando item..." />
            )
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : mode !== 'create' && !query.data ? (
            <EmptyState
              title="Item não encontrado."
              description="O item não está disponível neste contexto."
              action={
                <Button component={Link} to="/products">
                  Voltar para a lista
                </Button>
              }
            />
          ) : mode === 'view' ? (
            <ProductProfile item={query.data} />
          ) : (
            <ProductStepForm key={id ?? 'new'} initial={mode === 'create' ? null : query.data} />
          )}
        </>
      )}
    </Box>
  );
}
Editor.propTypes = ProductEditorPage.propTypes;
