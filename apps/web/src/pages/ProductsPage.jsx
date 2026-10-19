import { TotalCard } from '../components/common/TotalCard.jsx';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { createProductListTheme } from '../features/products/product-list-theme.js';
import { unitModule } from '../features/units/unit-module.js';
import { useLookupList } from '../features/catalog-lookups/lookup-queries.js';
import { groupModule } from '../features/product-groups/group-module.js';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
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
  Tooltip,
  Typography
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { CreateButton } from '../components/common/CreateButton.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { EntityModuleContext } from '../features/parties/entity-module.js';
import { useEntityList, useEntitySummary } from '../features/parties/entity-queries.js';
import { EntityDemoNotice, EntityStatus } from '../features/parties/EntityShared.jsx';
import { EntityStatusAction } from '../features/parties/EntityStatusAction.jsx';
import { productModule } from '../features/products/product-module.js';
import { formatMoney } from '../components/business/money.js';

// Mesmo padrão de listagem dos cadastros, com dados específicos do catálogo único.
export function ProductsPage() {
  const base = useTheme();
  const theme = useMemo(() => createProductListTheme(base), [base]);
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          bgcolor: 'background.default',
          color: 'text.primary',
          minHeight: 'calc(100vh - 130px)',
          p: { xs: 1, sm: 2 }
        }}
      >
        <EntityModuleContext.Provider value={productModule}>
          <ProductList />
        </EntityModuleContext.Provider>
      </Box>
    </ThemeProvider>
  );
}
const defaults = { search: '', type: '', status: '', category: '', unit: '', page: 1, pageSize: 10 };
function ProductList() {
  const unitsQuery = useLookupList(unitModule);
  const groups = useLookupList(groupModule);
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const location = useLocation();
  const [feedback, setFeedback] = useState(location.state?.productFeedback ?? '');
  useEffect(() => {
    const timer = setTimeout(() => setFilters((old) => ({ ...old, search, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useEntityList(filters);
  const summary = useEntitySummary();
  const clear = () => {
    setSearch('');
    setFilters(defaults);
  };
  const change = (key) => (event) => setFilters((old) => ({ ...old, [key]: event.target.value, page: 1 }));
  const create = (
    <CreateButton component={Link} to="/products/new" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
      Novo item
    </CreateButton>
  );
  const filtered = Boolean(
    filters.search || filters.type || filters.status || filters.category || filters.unit
  );
  const page = query.data?.page ?? 1;
  return (
    <Box
      sx={{
        maxWidth: 1120,
        mx: 'auto',
        py: 2,
        '& h1': { fontSize: 26, fontWeight: 650 },
        '& .MuiTypography-body2': { fontSize: 14 }
      }}
    >
      <PageHeader
        title="Produtos e serviços"
        description="Gerencie os itens comercializados pela empresa."
        action={import.meta.env.DEV ? create : undefined}
      />
      {!import.meta.env.DEV ? (
        <Alert severity="info">Catálogo aguarda integração com o backend.</Alert>
      ) : (
        <>
          <EntityDemoNotice />
          {/* Duas colunas em telas pequenas preservam a leitura; tokens acompanham Light/Dark. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
              my: 4
            }}
          >
            {[
              ['Itens no total', 'total'],
              ['Produtos', 'products'],
              ['Serviços', 'services'],
              ['Ativos', 'active']
            ].map(([label, key]) => (
              <TotalCard
                key={key}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '14px',
                  p: '18px 22px',
                  boxShadow: 'none'
                }}
              >
                <Typography color="text.secondary" sx={{ fontSize: 13, mb: 0.5 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 650 }}>{summary.data?.[key] ?? '—'}</Typography>
              </TotalCard>
            ))}
          </Box>
          {summary.isError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={<Button onClick={() => summary.refetch()}>Tentar novamente</Button>}
            >
              {summary.error.message}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Buscar item"
                placeholder="Nome, código, GTIN ou categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
              <Stack direction="row" gap={1} alignItems="center" aria-label="Tipo de item">
                {[
                  ['', 'Todos'],
                  ['PRODUCT', 'Produtos'],
                  ['SERVICE', 'Serviços']
                ].map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    clickable
                    aria-pressed={filters.type === value}
                    onClick={() => setFilters((old) => ({ ...old, type: value, page: 1 }))}
                    sx={{
                      bgcolor: filters.type === value ? 'primary.soft' : 'transparent',
                      color: filters.type === value ? 'primary.dark' : 'text.secondary',
                      border: '1px solid',
                      borderColor: filters.type === value ? 'primary.soft' : 'divider'
                    }}
                  />
                ))}
              </Stack>
              <TextField
                select
                label="Status"
                value={filters.status}
                onChange={change('status')}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ACTIVE">Ativos</MenuItem>
                <MenuItem value="INACTIVE">Inativos</MenuItem>
              </TextField>
            </Stack>
            <Button
              onClick={() => setAdvanced((value) => !value)}
              aria-expanded={advanced}
              sx={{ alignSelf: 'flex-start' }}
            >
              Mais filtros
            </Button>
            <Collapse in={advanced}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2,minmax(0,1fr))',
                    lg: 'repeat(2,minmax(0,1fr)) auto'
                  },
                  gap: 2
                }}
              >
                <TextField
                  label="Grupo"
                  value={filters.category}
                  onChange={change('category')}
                  slotProps={{ htmlInput: { list: 'product-group-filter' } }}
                />
                <datalist id="product-group-filter">
                  {(groups.data?.items ?? []).map((group) => (
                    <option key={group.id} value={group.name} />
                  ))}
                </datalist>
                <TextField
                  label="Unidade"
                  value={filters.unit}
                  onChange={(event) =>
                    setFilters((old) => ({ ...old, unit: event.target.value.toUpperCase(), page: 1 }))
                  }
                  slotProps={{ htmlInput: { list: 'product-filter-units', maxLength: 10 } }}
                />
                <datalist id="product-filter-units">
                  {(unitsQuery.data?.items ?? []).map(({ id, abbreviation: code, description: label }) => (
                    <option key={id} value={code}>
                      {label}
                    </option>
                  ))}
                </datalist>
                <Button variant="outlined" onClick={clear}>
                  Limpar filtros
                </Button>
              </Box>
            </Collapse>
          </Stack>
          {query.isPending ? (
            <LoadingState message="Carregando itens..." />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : !query.data.total ? (
            <EmptyState
              title={
                filtered
                  ? 'Nenhum item encontrado com os filtros informados.'
                  : 'Nenhum produto ou serviço cadastrado.'
              }
              description={
                filtered
                  ? 'Revise os filtros para consultar outros itens.'
                  : 'Cadastre seu primeiro item para começar.'
              }
              action={filtered ? <Button onClick={clear}>Limpar filtros</Button> : create}
            />
          ) : (
            <>
              <TableContainer
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '14px',
                  bgcolor: 'background.paper',
                  overflowX: 'auto'
                }}
              >
                <Table
                  aria-label="Produtos e Serviços"
                  sx={{
                    minWidth: 720,
                    '& th': {
                      bgcolor: 'transparent',
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: 12,
                      py: 2
                    },
                    '& td': { fontSize: 13, py: 1.75 },
                    '& .MuiIconButton-root': { bgcolor: 'transparent', border: 0, boxShadow: 'none' },
                    '& tr:last-child td': { borderBottom: 0 }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {['Item', 'Grupo', 'Preço', 'Status', 'Ações'].map((label) => (
                        <TableCell key={label} align={label === 'Ações' ? 'right' : 'left'}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.items.map((item) => (
                      <TableRow hover key={item.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            {item.type === 'PRODUCT' ? (
                              <Inventory2OutlinedIcon color="action" />
                            ) : (
                              <HandymanOutlinedIcon color="action" />
                            )}
                            <Box sx={{ maxWidth: 280 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {item.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.code}
                                {item.gtin ? ' / ' + item.gtin : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{item.category || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatMoney(item.priceCents)}</TableCell>
                        <TableCell>
                          <EntityStatus status={item.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Visualizar item">
                            <IconButton
                              component={Link}
                              to={`/products/${item.id}`}
                              aria-label={`Visualizar item ${item.name}`}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar item">
                            <IconButton
                              component={Link}
                              to={`/products/${item.id}/edit`}
                              aria-label={`Editar item ${item.name}`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={item.status === 'ACTIVE' ? 'Inativar item' : 'Ativar item'}>
                            <IconButton
                              onClick={() => setSelected(item)}
                              aria-label={`${item.status === 'ACTIVE' ? 'Inativar' : 'Ativar'} item ${item.name}`}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2">
                  Mostrando {(page - 1) * filters.pageSize + 1} a{' '}
                  {Math.min(page * filters.pageSize, query.data.total)} de {query.data.total} registros
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    select
                    label="Por página"
                    value={filters.pageSize}
                    onChange={(event) =>
                      setFilters((old) => ({ ...old, page: 1, pageSize: Number(event.target.value) }))
                    }
                    sx={{ minWidth: 95 }}
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    disabled={page <= 1 || query.isFetching}
                    onClick={() => setFilters((old) => ({ ...old, page: page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Typography variant="body2">{page}</Typography>
                  <Button
                    disabled={page * filters.pageSize >= query.data.total || query.isFetching}
                    onClick={() => setFilters((old) => ({ ...old, page: page + 1 }))}
                  >
                    Próxima
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
          {selected && <EntityStatusAction customer={selected} onClose={() => setSelected(null)} />}
          <Snackbar open={Boolean(feedback)} autoHideDuration={5000} onClose={() => setFeedback('')}>
            <Alert severity="success" onClose={() => setFeedback('')}>
              {feedback}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
}
