import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
import { productCategories, units, itemTypeLabel } from '../features/products/product-options.js';
import { formatMoney } from '../components/business/money.js';

// Mesmo padrão de listagem dos cadastros, com dados específicos do catálogo único.
export function ProductsPage() {
  return (
    <EntityModuleContext.Provider value={productModule}>
      <ProductList />
    </EntityModuleContext.Provider>
  );
}
const defaults = { search: '', type: '', status: '', category: '', unit: '', page: 1, pageSize: 10 };
function ProductList() {
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
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
    <>
      <PageHeader title="Produtos e Serviços" description="Gerencie os itens comercializados pela empresa." />
      {!import.meta.env.DEV ? (
        <Alert severity="info">Catálogo aguarda integração com o backend.</Alert>
      ) : (
        <>
          <EntityDemoNotice />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
              gap: 2,
              mb: 3
            }}
          >
            {[
              ['Total de itens', 'total', Inventory2OutlinedIcon, 'info'],
              ['Produtos', 'products', Inventory2OutlinedIcon, 'primary'],
              ['Serviços', 'services', HandymanOutlinedIcon, 'warning'],
              ['Itens ativos', 'active', CheckCircleOutlineIcon, 'success']
            ].map(([label, key, Icon, tone]) => (
              <Card key={key} sx={{ bgcolor: tone + '.soft', borderColor: tone + '.main', borderRadius: 2 }}>
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}
                >
                  <Icon sx={{ color: tone + '.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {label}
                    </Typography>
                    <Typography variant="h2">{summary.data?.[key] ?? '—'}</Typography>
                  </Box>
                </CardContent>
              </Card>
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
              {create}
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2,minmax(0,1fr))',
                  lg: 'repeat(4,minmax(0,1fr)) auto'
                },
                gap: 2
              }}
            >
              <TextField select label="Tipo" value={filters.type} onChange={change('type')}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PRODUCT">Produtos</MenuItem>
                <MenuItem value="SERVICE">Serviços</MenuItem>
              </TextField>
              <TextField select label="Status" value={filters.status} onChange={change('status')}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ACTIVE">Ativos</MenuItem>
                <MenuItem value="INACTIVE">Inativos</MenuItem>
              </TextField>
              <TextField select label="Categoria" value={filters.category} onChange={change('category')}>
                <MenuItem value="">Todas</MenuItem>
                {productCategories.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Unidade"
                value={filters.unit}
                onChange={(event) =>
                  setFilters((old) => ({ ...old, unit: event.target.value.toUpperCase(), page: 1 }))
                }
                slotProps={{ htmlInput: { list: 'product-filter-units', maxLength: 10 } }}
              />
              <datalist id="product-filter-units">
                {units.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </datalist>
              <Button variant="outlined" onClick={clear}>
                Limpar filtros
              </Button>
            </Box>
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
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}
              >
                <Table
                  aria-label="Produtos e Serviços"
                  sx={{
                    minWidth: 950,
                    '& th': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      textTransform: 'uppercase',
                      fontWeight: 750,
                      fontSize: 12,
                      py: 2
                    },
                    '& td': { fontSize: 13, py: 1.75 },
                    '& tbody tr:nth-of-type(even)': { bgcolor: 'surface.secondary' },
                    '& tr:last-child td': { borderBottom: 0 }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {['Item', 'Código', 'Categoria', 'Tipo', 'Preço', 'Unidade', 'Status', 'Ações'].map(
                        (label) => (
                          <TableCell key={label} align={label === 'Ações' ? 'right' : 'left'}>
                            {label}
                          </TableCell>
                        )
                      )}
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
                              {item.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {item.description}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.code}</Typography>
                          {item.type === 'PRODUCT' && item.gtin && (
                            <Typography variant="caption" color="text.secondary">
                              {item.gtin}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{item.category || '—'}</TableCell>
                        <TableCell>{itemTypeLabel(item.type)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatMoney(item.priceCents)}</TableCell>
                        <TableCell>{item.unit || '—'}</TableCell>
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
    </>
  );
}
