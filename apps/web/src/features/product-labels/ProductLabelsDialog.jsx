import { useCallback, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { CancelButton } from '../../components/common/CancelButton.jsx';
import { LoadingState } from '../../components/feedback/LoadingState.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { EntityModuleContext } from '../parties/entity-module.js';
import { useEntitySource, useEntityList } from '../parties/entity-queries.js';
import { productModule } from '../products/product-module.js';
import { useLookupList } from '../catalog-lookups/lookup-queries.js';
import { groupModule } from '../product-groups/group-module.js';
import { brandModule } from '../brands/brand-module.js';
import { formatMoney } from '../../components/business/money.js';
import { LABEL_MODEL, buildLabels, labelPreviewCss, labelQuantity, labelTotals } from './label-model.js';
import { ProductLabel } from './ProductLabel.jsx';
import { LabelPrintFrame } from './LabelPrintFrame.jsx';

const defaults = {
  type: 'PRODUCT',
  status: 'ACTIVE',
  searchField: 'name',
  search: '',
  groupId: '',
  brandId: '',
  page: 1,
  pageSize: 10
};
const fields = {
  name: ['Nome', 'Digite o nome do produto...'],
  code: ['Código', 'Digite o código...'],
  gtin: ['Código de barras', 'Digite o código de barras...']
};

// Modal de consumo do catálogo, sem rota ou persistência de seleção. Contexto próprio
// reaproveita exatamente as queries e o repository de Produtos, inclusive a remarcação.
export function ProductLabelsDialog({ open, onClose }) {
  return open ? (
    <EntityModuleContext.Provider value={productModule}>
      <ScopedLabels onClose={onClose} />
    </EntityModuleContext.Provider>
  ) : null;
}
ProductLabelsDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired };
function ScopedLabels({ onClose }) {
  const { scope } = useEntitySource();
  return <LabelManager key={JSON.stringify(scope)} onClose={onClose} />;
}
ScopedLabels.propTypes = { onClose: PropTypes.func.isRequired };

function LabelManager({ onClose }) {
  const { repository, scope, enabled } = useEntitySource();
  const client = useQueryClient();
  const [filters, setFilters] = useState(defaults);
  const query = useEntityList(filters);
  const groups = useLookupList(groupModule);
  const brands = useLookupList(brandModule);
  const [selection, setSelection] = useState({});
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const jobNumber = useRef(0);
  const locked = useRef(false);
  const mobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const ids = Object.keys(selection);
  // Detalhes usam as MESMAS keys de useEntityDetail: remarcações invalidam também a prévia.
  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...scope, 'detail', id],
      queryFn: () => repository.getById(id),
      enabled,
      retry: false
    }))
  });
  const totals = labelTotals(selection);
  const rows = query.data?.items ?? [];
  const visible = rows.filter((p) => p.status === 'ACTIVE').map((p) => p.id);
  const selectedVisible = visible.filter((id) => id in selection);
  const allVisible = Boolean(visible.length) && selectedVisible.length === visible.length;
  const detailError = details.some((detail) => detail.isError);
  const detailLoading = details.some((detail) => detail.isPending || detail.isFetching);
  let previewLabels = [];
  let previewError = '';
  if (preview && !detailLoading && !detailError) {
    try {
      previewLabels = buildLabels(
        details.map((detail) => detail.data),
        selection,
        LABEL_MODEL.previewLimit
      );
    } catch (reason) {
      previewError = reason.message;
    }
  }
  const setFilter = (key, value) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const toggle = (id) =>
    setSelection((old) => {
      const next = { ...old };
      if (id in next) delete next[id];
      else next[id] = '1';
      return next;
    });
  const selectVisible = () =>
    setSelection((old) => {
      const next = { ...old };
      for (const id of visible) {
        if (allVisible) delete next[id];
        else if (!(id in next)) next[id] = '1';
      }
      return next;
    });
  const finishPrint = useCallback(() => {
    locked.current = false;
    setBusy(false);
  }, []);
  const failPrint = useCallback((message) => {
    locked.current = false;
    setBusy(false);
    setError(message);
  }, []);
  async function prepare(print = false) {
    if (locked.current || !totals.valid) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setJob(null);
    try {
      // Releitura obrigatória antes da prévia/impressão, sem cache paralelo de preços.
      const products = await Promise.all(
        ids.map((id) =>
          client.fetchQuery({
            queryKey: [...scope, 'detail', id],
            queryFn: () => repository.getById(id),
            staleTime: 0
          })
        )
      );
      const labels = buildLabels(products, selection);
      if (print) setJob({ id: ++jobNumber.current, labels });
      else {
        setPreview(true);
        locked.current = false;
        setBusy(false);
      }
    } catch (reason) {
      failPrint(reason.message);
    }
  }
  const back = () => {
    setPreview(false);
    setJob(null);
    setError('');
  };
  const checkbox = (item) => (
    <Checkbox
      disabled={busy || item.status !== 'ACTIVE'}
      checked={item.id in selection}
      onChange={() => toggle(item.id)}
      inputProps={{ 'aria-label': `Selecionar ${item.name}` }}
    />
  );
  const quantity = (item) => (
    <TextField
      label={`Quantidade de ${item.name}`}
      value={selection[item.id] ?? ''}
      disabled={busy || !(item.id in selection)}
      error={item.id in selection && !labelQuantity(selection[item.id])}
      helperText={
        item.id in selection && !labelQuantity(selection[item.id]) ? 'Inteiro de 1 a 1000.' : undefined
      }
      slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
      onChange={(e) => setSelection((old) => ({ ...old, [item.id]: e.target.value }))}
      sx={{ width: mobile ? '100%' : 145 }}
    />
  );
  const selectAll = (
    <Checkbox
      disabled={busy || !visible.length}
      checked={allVisible}
      indeterminate={selectedVisible.length > 0 && !allVisible}
      onChange={selectVisible}
      inputProps={{ 'aria-label': 'Selecionar todos os produtos visíveis' }}
    />
  );

  return (
    <Dialog
      open
      fullWidth
      maxWidth="lg"
      fullScreen={mobile}
      onClose={busy ? undefined : preview ? back : onClose}
      aria-labelledby="product-labels-title"
    >
      <DialogTitle id="product-labels-title" sx={{ pr: 7 }}>
        {preview ? 'Pré-visualização de etiquetas' : 'Etiquetas de produtos'}
        <Typography variant="body2" color="text.secondary">
          Selecione os produtos e prepare as etiquetas para impressão.
        </Typography>
        <IconButton
          aria-label="Fechar etiquetas"
          disabled={busy}
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: mobile ? undefined : 440 }}>
        {!enabled ? (
          <Alert severity="info">Etiquetas aguardam integração com o backend.</Alert>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Demonstração local — utiliza os produtos deste navegador. O código de barras é exibido somente
              em texto, sem barras escaneáveis.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {!preview ? (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '150px 2fr 1fr 1fr auto' },
                    gap: 2,
                    mb: 2
                  }}
                >
                  <TextField
                    select
                    label="Filtro"
                    value={filters.searchField}
                    disabled={busy}
                    onChange={(e) => setFilter('searchField', e.target.value)}
                  >
                    {Object.entries(fields).map(([key, [label]]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Pesquisa"
                    placeholder={fields[filters.searchField][1]}
                    value={filters.search}
                    disabled={busy}
                    onChange={(e) => setFilter('search', e.target.value)}
                  />
                  <TextField
                    select
                    label="Grupo"
                    value={filters.groupId}
                    disabled={busy || groups.isPending || groups.isError}
                    onChange={(e) =>
                      setFilters((old) => ({
                        ...old,
                        groupId: e.target.value,
                        groupName: groups.data?.items.find((p) => p.id === e.target.value)?.name,
                        page: 1
                      }))
                    }
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {(groups.data?.items ?? []).map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Marca"
                    value={filters.brandId}
                    disabled={busy || brands.isPending || brands.isError}
                    onChange={(e) =>
                      setFilters((old) => ({
                        ...old,
                        brandId: e.target.value,
                        brandName: brands.data?.items.find((p) => p.id === e.target.value)?.name,
                        page: 1
                      }))
                    }
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {(brands.data?.items ?? []).map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button disabled={busy} onClick={() => setFilters(defaults)}>
                    Limpar filtros
                  </Button>
                </Box>
                {(groups.isError || brands.isError) && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        onClick={() => {
                          groups.refetch();
                          brands.refetch();
                        }}
                      >
                        Tentar novamente
                      </Button>
                    }
                  >
                    Não foi possível carregar grupos ou marcas.
                  </Alert>
                )}
                {query.isPending ? (
                  <LoadingState message="Carregando produtos..." />
                ) : query.isError ? (
                  <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
                ) : !rows.length ? (
                  <EmptyState
                    title="Nenhum produto encontrado."
                    description="Nenhum produto corresponde aos filtros informados."
                  />
                ) : (
                  <>
                    {mobile ? (
                      <Stack spacing={2}>
                        <Stack direction="row" alignItems="center">
                          {selectAll}
                          <Typography>Selecionar página</Typography>
                        </Stack>
                        {rows.map((item) => (
                          <Box
                            key={item.id}
                            sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 2 }}
                          >
                            <Stack direction="row" alignItems="center">
                              {checkbox(item)}
                              <Typography fontWeight={600}>{item.name}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {item.code} · {formatMoney(item.priceCents)}
                            </Typography>
                            {quantity(item)}
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <TableContainer>
                        <Table size="small" aria-label="Produtos para etiquetas" sx={{ minWidth: 920 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>{selectAll}</TableCell>
                              {[
                                'Código',
                                'Produto',
                                'Grupo',
                                'Marca',
                                'Preço',
                                'Código de barras',
                                'Qtd. etiquetas'
                              ].map((label) => (
                                <TableCell key={label}>{label}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{checkbox(item)}</TableCell>
                                <TableCell>{item.code}</TableCell>
                                <TableCell sx={{ maxWidth: 250, overflowWrap: 'anywhere' }}>
                                  {item.name}
                                </TableCell>
                                <TableCell>{item.category || '—'}</TableCell>
                                <TableCell>{item.brand || '—'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  {formatMoney(item.priceCents)}
                                </TableCell>
                                <TableCell>{item.gtin || 'Sem código de barras'}</TableCell>
                                <TableCell>{quantity(item)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Button
                        disabled={busy || query.data.page <= 1}
                        onClick={() => setFilters((old) => ({ ...old, page: query.data.page - 1 }))}
                      >
                        Anterior
                      </Button>
                      <Typography variant="body2">
                        {query.data.page} / {Math.max(1, Math.ceil(query.data.total / filters.pageSize))}
                      </Typography>
                      <Button
                        disabled={busy || query.data.page * filters.pageSize >= query.data.total}
                        onClick={() => setFilters((old) => ({ ...old, page: query.data.page + 1 }))}
                      >
                        Próxima
                      </Button>
                    </Stack>
                  </>
                )}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  gap={2}
                  sx={{ mt: 3 }}
                >
                  <TextField
                    select
                    label="Modelo de etiqueta"
                    value="standard"
                    sx={{ minWidth: 180 }}
                    disabled={busy}
                  >
                    <MenuItem value="standard">Padrão</MenuItem>
                  </TextField>
                  <Button disabled={busy || !ids.length} onClick={() => setSelection({})}>
                    Limpar seleção
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Typography sx={{ mb: 2 }}>
                  Mostrando as primeiras {Math.min(totals.total, LABEL_MODEL.previewLimit)} de {totals.total}{' '}
                  etiquetas. Impressão: modelo Padrão, {LABEL_MODEL.width} × {LABEL_MODEL.height} mm, papel
                  A4.
                </Typography>
                {detailLoading ? (
                  <LoadingState message="Atualizando preços das etiquetas..." />
                ) : detailError ? (
                  <ErrorState
                    description="Não foi possível consultar os produtos selecionados."
                    onRetry={() => prepare()}
                  />
                ) : previewError ? (
                  <Alert severity="error">{previewError}</Alert>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      justifyContent: { xs: 'center', sm: 'flex-start' },
                      maxHeight: 500,
                      overflowY: 'auto',
                      p: 1
                    }}
                  >
                    <style>{labelPreviewCss}</style>
                    {previewLabels.map(({ key, product }) => (
                      <ProductLabel key={key} product={product} />
                    ))}
                  </Box>
                )}
              </>
            )}
            <Typography role="status" sx={{ mt: 2 }}>
              Produtos selecionados: {totals.products} · Total de etiquetas: {totals.total}
            </Typography>
            {!ids.length && (
              <Typography variant="body2" color="text.secondary">
                Selecione pelo menos um produto.
              </Typography>
            )}
            {ids.length > 0 && !totals.valid && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Informe quantidades inteiras positivas. Limite de {LABEL_MODEL.maxLabels} etiquetas por lote.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        {preview ? (
          <Button disabled={busy} onClick={back}>
            Voltar
          </Button>
        ) : (
          <CancelButton disabled={busy} onClick={onClose}>
            Cancelar
          </CancelButton>
        )}
        <Button
          variant="contained"
          disabled={
            !enabled ||
            !totals.valid ||
            busy ||
            (preview && (detailLoading || detailError || Boolean(previewError)))
          }
          onClick={() => prepare(preview)}
        >
          {busy ? 'Preparando...' : preview ? 'Imprimir' : 'Pré-visualizar etiquetas'}
        </Button>
      </DialogActions>
      {job && <LabelPrintFrame key={job.id} labels={job.labels} onReady={finishPrint} onError={failPrint} />}
    </Dialog>
  );
}
LabelManager.propTypes = { onClose: PropTypes.func.isRequired };
