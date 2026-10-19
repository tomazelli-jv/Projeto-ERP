import { useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Snackbar,
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
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { EntityModuleContext } from '../features/parties/entity-module.js';
import { EntityDemoNotice, EntityStatus } from '../features/parties/EntityShared.jsx';
import { useEntitySource, useEntityList } from '../features/parties/entity-queries.js';
import { productModule } from '../features/products/product-module.js';
import { useLookupList } from '../features/catalog-lookups/lookup-queries.js';
import { groupModule } from '../features/product-groups/group-module.js';
import { brandModule } from '../features/brands/brand-module.js';
import { formatMoney, moneyInput, parseMoney } from '../components/business/money.js';
import {
  buildPricePreview,
  validNewPrice,
  priceChangeLabel,
  summarizePreview
} from '../features/products/repricing.js';
import { useRepricingMutation } from '../features/products/useRepricing.js';

const defaults = {
  search: '',
  searchField: 'name',
  groupId: '',
  brandId: '',
  status: 'ACTIVE',
  page: 1,
  pageSize: 10,
  type: 'PRODUCT'
};
const searchLabels = { name: 'Nome', code: 'Código', gtin: 'Código de barras' };
const placeholders = {
  name: 'Digite o nome do produto...',
  code: 'Digite o código...',
  gtin: 'Digite o código de barras...'
};

export function RepricingPage() {
  return (
    <EntityModuleContext.Provider value={productModule}>
      <ScopedRepricing />
    </EntityModuleContext.Provider>
  );
}

// Trocar identidade/empresa desmonta o rascunho; nunca reaplica seleção de outro escopo.
function ScopedRepricing() {
  const { scope, enabled } = useEntitySource();
  return enabled ? (
    <Repricing key={JSON.stringify(scope)} />
  ) : (
    <Alert severity="info">Remarcação aguarda integração com o backend.</Alert>
  );
}

function Repricing() {
  const { repository } = useEntitySource();
  const groups = useLookupList(groupModule);
  const brands = useLookupList(brandModule);
  const [filters, setFilters] = useState(defaults);
  const query = useEntityList(filters);
  const mutation = useRepricingMutation();
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('PERCENT');
  const [adjustment, setAdjustment] = useState('');
  const [preview, setPreview] = useState([]);
  const [manual, setManual] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const submitting = useRef(false);
  const mobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const busy = generating || mutation.isPending;
  const rows = query.data?.items ?? [];
  const visible = rows.filter((item) => item.status === 'ACTIVE').map((item) => item.id);
  const selectedVisible = visible.filter((id) => selected.includes(id));
  const totals = summarizePreview(preview);
  const changed = preview.filter(
    (row) => validNewPrice(row.newPriceCents) && row.newPriceCents !== row.previousPriceCents
  );
  const clearPreview = () => {
    setPreview([]);
    setManual({});
    setError('');
    mutation.reset();
  };
  const select = (ids) => {
    setSelected(ids);
    clearPreview();
  };
  const toggle = (id) =>
    select(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  const setFilter = (key, value) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const generate = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setGenerating(true);
    clearPreview();
    try {
      // Só a prévia captura o preço anterior; a seleção guarda apenas IDs do catálogo.
      const products = await Promise.all(selected.map((id) => repository.getById(id)));
      if (products.some((product) => !product))
        throw Error('Um produto não está mais disponível. Limpe a seleção e consulte novamente.');
      const result = buildPricePreview(products, mode, adjustment);
      setPreview(result);
    } catch (reason) {
      setError(reason.message);
    } finally {
      submitting.current = false;
      setGenerating(false);
    }
  };
  const apply = async () => {
    if (submitting.current || totals.invalid || !changed.length) return;
    submitting.current = true;
    try {
      const updated = await mutation.mutateAsync(
        changed.map(({ productId, previousPriceCents, newPriceCents }) => ({
          productId,
          previousPriceCents,
          newPriceCents
        }))
      );
      setConfirm(false);
      setSelected([]);
      setPreview([]);
      setManual({});
      setFeedback(`${updated.length} produtos foram remarcados com sucesso.`);
    } catch {
      /* A mutation exibe o erro preservando a prévia para revisão. */
    } finally {
      submitting.current = false;
    }
  };
  const previewFor = (id) => preview.find((row) => row.productId === id);
  const changeText = (row) => (
    <Typography
      variant="body2"
      color={
        !validNewPrice(row.newPriceCents)
          ? 'error.main'
          : row.newPriceCents < row.previousPriceCents
            ? 'warning.main'
            : row.newPriceCents > row.previousPriceCents
              ? 'success.main'
              : 'text.secondary'
      }
    >
      {priceChangeLabel(row.previousPriceCents, row.newPriceCents)}
    </Typography>
  );
  const newPriceField = (row) => (
    <TextField
      size="small"
      label={`Novo preço de ${row.name}`}
      value={manual[row.productId] ?? moneyInput(row.newPriceCents)}
      disabled={busy || confirm}
      error={!validNewPrice(row.newPriceCents)}
      helperText={
        !validNewPrice(row.newPriceCents)
          ? 'Informe um preço maior que zero.'
          : row.manual
            ? 'Ajustado manualmente'
            : undefined
      }
      slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 20 } }}
      sx={{ minWidth: 160 }}
      onChange={(event) => {
        const value = event.target.value;
        setManual((old) => ({ ...old, [row.productId]: value }));
        setPreview((old) =>
          old.map((entry) =>
            entry.productId === row.productId
              ? { ...entry, newPriceCents: parseMoney(value), manual: true }
              : entry
          )
        );
      }}
    />
  );
  const selection = (item) => (
    <Checkbox
      checked={selected.includes(item.id)}
      disabled={busy || item.status !== 'ACTIVE'}
      onChange={() => toggle(item.id)}
      inputProps={{ 'aria-label': `Selecionar ${item.name}` }}
    />
  );

  const selectPage = (
    <Checkbox
      checked={Boolean(visible.length) && selectedVisible.length === visible.length}
      indeterminate={selectedVisible.length > 0 && selectedVisible.length < visible.length}
      disabled={busy || !visible.length}
      inputProps={{ 'aria-label': 'Selecionar todos os produtos visíveis' }}
      onChange={() =>
        select(
          selectedVisible.length === visible.length
            ? selected.filter((id) => !visible.includes(id))
            : [...new Set([...selected, ...visible])]
        )
      }
    />
  );
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      <PageHeader
        title="Remarcação de preços"
        description="Atualize os preços de venda dos produtos com segurança."
        breadcrumbs={['Produtos', 'Remarcação']}
      />
      <EntityDemoNotice />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: '160px minmax(200px, 2fr) repeat(3, minmax(120px, 1fr)) auto'
          },
          gap: 2,
          mb: 3
        }}
      >
        <TextField
          select
          label="Filtro"
          value={filters.searchField}
          disabled={busy}
          onChange={(e) => setFilter('searchField', e.target.value)}
        >
          {Object.entries(searchLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Pesquisa"
          placeholder={placeholders[filters.searchField]}
          value={filters.search}
          disabled={busy}
          onChange={(e) => setFilter('search', e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }
          }}
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
              groupName: groups.data?.items.find((item) => item.id === e.target.value)?.name,
              page: 1
            }))
          }
        >
          <MenuItem value="">Todos</MenuItem>
          {(groups.data?.items ?? []).map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
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
              brandName: brands.data?.items.find((item) => item.id === e.target.value)?.name,
              page: 1
            }))
          }
        >
          <MenuItem value="">Todas</MenuItem>
          {(brands.data?.items ?? []).map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={filters.status}
          disabled={busy}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <MenuItem value="ACTIVE">Ativos</MenuItem>
          <MenuItem value="INACTIVE">Inativos</MenuItem>
          <MenuItem value="">Todos</MenuItem>
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
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, display: { xs: 'flex', sm: 'none' } }}
          >
            {selectPage}
            <Typography variant="body2">Selecionar página atual</Typography>
          </Stack>
          {/* Mobile apresenta cards, preservando preços e seleção sem comprimir dez colunas. */}
          {mobile ? (
            <Stack spacing={2}>
              {rows.map((item) => {
                const entry = previewFor(item.id);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      border: '1px solid',
                      borderColor: entry && !validNewPrice(entry.newPriceCents) ? 'error.main' : 'divider',
                      borderRadius: 2,
                      p: 2
                    }}
                  >
                    <Stack direction="row" alignItems="center">
                      {selection(item)}
                      <Typography fontWeight={600}>{item.name}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {item.code} · {item.category || 'Sem grupo'}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      <EntityStatus status={item.status} />
                      <Typography>Preço atual: {formatMoney(item.priceCents)}</Typography>
                      {entry && (
                        <>
                          {newPriceField(entry)}
                          {changeText(entry)}
                        </>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table
                size="small"
                aria-label="Produtos para remarcação"
                sx={{ minWidth: 1000, '& td': { py: 1.5 } }}
              >
                <TableHead>
                  <TableRow>
                    {[
                      'Seleção',
                      'Código',
                      'Produto',
                      'Grupo',
                      'Marca',
                      'Custo',
                      'Preço atual',
                      'Novo preço',
                      'Alteração',
                      'Status'
                    ].map((label) => (
                      <TableCell key={label}>{label === 'Seleção' ? selectPage : label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => {
                    const entry = previewFor(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        sx={{
                          outline: entry && !validNewPrice(entry.newPriceCents) ? '1px solid' : undefined,
                          outlineColor: 'error.main'
                        }}
                      >
                        <TableCell>{selection(item)}</TableCell>
                        <TableCell>{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category || '—'}</TableCell>
                        <TableCell>{item.brand || '—'}</TableCell>
                        <TableCell>{formatMoney(item.costCents)}</TableCell>
                        <TableCell>{formatMoney(item.priceCents)}</TableCell>
                        <TableCell>{entry ? newPriceField(entry) : '—'}</TableCell>
                        <TableCell>{entry ? changeText(entry) : '—'}</TableCell>
                        <TableCell>
                          <EntityStatus status={item.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
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
      <Stack direction="row" alignItems="center" spacing={2} sx={{ my: 2 }}>
        <Typography role="status">{selected.length} produtos selecionados</Typography>
        <Button disabled={busy || !selected.length} onClick={() => select([])}>
          Limpar seleção
        </Button>
      </Stack>
      {!selected.length && (
        <Typography color="text.secondary">
          Selecione pelo menos um produto para iniciar a remarcação.
        </Typography>
      )}
      <Collapse in={Boolean(selected.length)} timeout={reducedMotion ? 0 : 180}>
        <Box
          component="form"
          onSubmit={generate}
          sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          <Typography variant="h3" sx={{ mb: 2 }}>
            Remarcação
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Tipo de ajuste"
              value={mode}
              disabled={busy}
              sx={{ minWidth: 180 }}
              onChange={(e) => {
                setMode(e.target.value);
                clearPreview();
              }}
            >
              <MenuItem value="PERCENT">Percentual</MenuItem>
              <MenuItem value="VALUE">Valor</MenuItem>
              <MenuItem value="FIXED">Definir preço</MenuItem>
            </TextField>
            <TextField
              label={mode === 'PERCENT' ? 'Valor do ajuste (%)' : 'Valor do ajuste (R$)'}
              value={adjustment}
              disabled={busy}
              onChange={(e) => {
                setAdjustment(e.target.value);
                clearPreview();
              }}
              slotProps={{ htmlInput: { inputMode: 'text', maxLength: 20 } }}
              helperText={
                mode === 'FIXED'
                  ? 'Substitui o preço de todos os produtos selecionados.'
                  : 'Use sinal negativo para redução. Ex.: -5,00'
              }
            />
            <Button variant="outlined" type="submit" disabled={busy || !selected.length}>
              {generating ? 'Gerando...' : 'Gerar prévia'}
            </Button>
          </Stack>
        </Box>
      </Collapse>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {mutation.isError && !confirm && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {mutation.error.message} Gere uma nova prévia para atualizar.
        </Alert>
      )}
      {preview.length > 0 && (
        <Box
          sx={{
            mt: 3,
            animation: reducedMotion ? 'none' : 'repricing-summary 180ms ease-out',
            '@keyframes repricing-summary': { from: { opacity: 0 }, to: { opacity: 1 } }
          }}
        >
          <Stack direction="row" flexWrap="wrap" gap={1} role="status" aria-label="Resumo da prévia">
            {[
              ['Produtos selecionados', totals.selected],
              ['Com alteração', totals.changed],
              ['Sem alteração', totals.unchanged],
              ['Aumentos', totals.increases],
              ['Reduções', totals.reductions]
            ].map(([label, value]) => (
              <Chip key={label} label={`${label}: ${value}`} variant="outlined" />
            ))}
          </Stack>
          {totals.invalid > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {totals.invalid} preços inválidos. Corrija-os antes de confirmar.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
            A prévia inclui todos os selecionados, inclusive os de outras páginas e filtros.
          </Typography>
          {/* Revisão completa permite corrigir também produtos selecionados fora do filtro atual. */}
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" aria-label="Prévia completa">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Preço anterior</TableCell>
                  <TableCell>Novo preço</TableCell>
                  <TableCell>Alteração</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{formatMoney(row.previousPriceCents)}</TableCell>
                    <TableCell>{newPriceField(row)}</TableCell>
                    <TableCell>{changeText(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!totals.invalid && changed.length > 0 && (
            <Button sx={{ mt: 2 }} variant="contained" disabled={busy} onClick={() => setConfirm(true)}>
              Aplicar alterações
            </Button>
          )}
        </Box>
      )}
      <Dialog
        open={confirm}
        onClose={mutation.isPending ? undefined : () => setConfirm(false)}
        fullWidth
        maxWidth="md"
        fullScreen={mobile}
        aria-labelledby="repricing-confirm-title"
      >
        <DialogTitle id="repricing-confirm-title">Confirmar remarcação</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>
            Revise as alterações antes de atualizar os preços. {changed.length} produtos serão alterados.
          </Typography>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {mutation.error.message}
            </Alert>
          )}
          <TableContainer>
            <Table size="small" aria-label="Confirmar preços">
              <TableHead>
                <TableRow>
                  {['Produto', 'Preço atual', 'Novo preço', 'Alteração'].map((label) => (
                    <TableCell key={label}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {changed.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{formatMoney(row.previousPriceCents)}</TableCell>
                    <TableCell>{formatMoney(row.newPriceCents)}</TableCell>
                    <TableCell>{changeText(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={() => setConfirm(false)}>
            Voltar
          </Button>
          <Button
            variant="contained"
            disabled={mutation.isPending || totals.invalid > 0 || !changed.length}
            onClick={apply}
          >
            {mutation.isPending ? 'Aplicando...' : 'Confirmar remarcação'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(feedback)} autoHideDuration={6000} onClose={() => setFeedback('')}>
        <Alert severity="success" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </Box>
  );
}
