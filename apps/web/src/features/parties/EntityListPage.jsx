import { alpha } from '@mui/material/styles';
import { EntityTypeChoice } from './EntityTypeChoice.jsx';
import { useEntityModule } from './entity-module.js';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../components/feedback/LoadingState.jsx';
import { formatPhone } from '../../components/business/business-formatters.js';
import { useEntityList, useEntitySummary } from './entity-queries.js';
import { customerName, customerDocument, initials, states, typeLabel } from '../customers/customer-model.js';
import { EntityDemoNotice, EntityStatus } from './EntityShared.jsx';
import { EntityStatusAction } from './EntityStatusAction.jsx';

const defaults = { search: '', type: '', status: '', city: '', state: '', page: 1, pageSize: 10 };
// Mesmo padrão da listagem de Usuários: query para dados, busca debounced e tabela com ações acessíveis.
export function EntityListPage() {
  const module = useEntityModule();
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const location = useLocation();
  const [feedback, setFeedback] = useState(location.state?.customerFeedback ?? '');
  useEffect(() => {
    const timer = setTimeout(() => setFilters((old) => ({ ...old, search, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useEntityList(filters);
  const summary = useEntitySummary();
  const change = (key) => (event) => setFilters((old) => ({ ...old, [key]: event.target.value, page: 1 }));
  const clear = () => {
    setSearch('');
    setFilters(defaults);
  };
  const create = <EntityTypeChoice />;
  const hasFilters = Boolean(
    filters.search || filters.type || filters.status || filters.city || filters.state
  );
  const page = query.data?.page ?? 1;
  return (
    <Box
      sx={(theme) =>
        theme.palette.mode === 'dark'
          ? {
              // Clientes e Fornecedores compartilham a mesma paleta Dark; Light mantém seus tokens.
              '& .MuiTable-root th': {
                bgcolor: alpha(theme.palette.primary.main, 0.22),
                color: 'text.primary'
              },
              '& .MuiTable-root tbody tr:nth-of-type(even)': {
                bgcolor: alpha(theme.palette.primary.main, 0.025)
              },
              '& .MuiTableContainer-root': { bgcolor: 'background.paper' },
              '& .MuiAvatar-root': {
                bgcolor: 'primary.soft',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'primary.border'
              },
              '& .MuiChip-root': {
                border: '1px solid',
                borderColor: 'primary.border',
                bgcolor: 'primary.soft',
                color: 'text.primary'
              },
              '& .MuiChip-colorSuccess': {
                color: 'success.main',
                bgcolor: alpha(theme.palette.success.main, 0.14),
                borderColor: alpha(theme.palette.success.main, 0.25)
              },
              '& .MuiChip-colorError': {
                color: 'error.main',
                bgcolor: alpha(theme.palette.error.main, 0.14),
                borderColor: alpha(theme.palette.error.main, 0.25)
              },
              '& .MuiAlert-standardInfo': {
                color: 'text.primary',
                bgcolor: 'primary.soft',
                borderColor: 'primary.border',
                '& .MuiAlert-icon': { color: 'primary.main' }
              }
            }
          : {}
      }
    >
      <PageHeader
        title={`${module.Plural}`}
        description={`Gerencie os ${module.plural} cadastrados no sistema.`}
      />
      {!import.meta.env.DEV ? (
        <Alert severity="info">{`${module.Plural} aguarda integração com o backend.`}</Alert>
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
              [`Total de ${module.plural}`, 'total', GroupsOutlinedIcon, 'info'],
              [`${module.Plural} ativos`, 'active', CheckCircleOutlineIcon, 'success'],
              ['Pessoa Física', 'persons', PersonOutlineIcon, 'warning'],
              ['Pessoa Jurídica', 'companies', BusinessOutlinedIcon, 'primary']
            ].map(([label, key, Icon, tone]) => (
              <Card
                key={key}
                sx={(theme) => ({
                  bgcolor: tone + '.soft',
                  borderColor: tone + '.main',
                  borderRadius: 2,
                  ...(theme.palette.mode === 'dark'
                    ? {
                        bgcolor: 'background.paper',
                        borderColor: 'divider',
                        borderLeft: '4px solid',
                        borderLeftColor: tone + '.main',
                        '& svg': {
                          boxSizing: 'content-box',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: tone + '.soft'
                        }
                      }
                    : {})
                })}
              >
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
                label={`Buscar ${module.singular}`}
                placeholder="Nome, documento, e-mail ou telefone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <TextField
                select
                label={module.commercial ? 'Pessoa' : 'Tipo'}
                value={filters.type}
                onChange={change('type')}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PERSON">Pessoa Física</MenuItem>
                <MenuItem value="COMPANY">Pessoa Jurídica</MenuItem>
              </TextField>
              <TextField select label="Status" value={filters.status} onChange={change('status')}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ACTIVE">Ativos</MenuItem>
                <MenuItem value="INACTIVE">Inativos</MenuItem>
              </TextField>
              <TextField label="Cidade" value={filters.city} onChange={change('city')} />
              <TextField select label="UF" value={filters.state} onChange={change('state')}>
                <MenuItem value="">Todas</MenuItem>
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={clear}>
                Limpar filtros
              </Button>
            </Box>
          </Stack>
          {query.isPending ? (
            <LoadingState message={`Carregando ${module.plural}...`} />
          ) : query.isError ? (
            <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
          ) : !query.data.total ? (
            <EmptyState
              title={
                hasFilters
                  ? `Nenhum ${module.singular} encontrado com os filtros informados.`
                  : `Nenhum ${module.singular} cadastrado.`
              }
              description={
                hasFilters
                  ? `Revise os filtros para consultar outros ${module.plural}.`
                  : `Cadastre seu primeiro ${module.singular} para começar.`
              }
              action={hasFilters ? <Button onClick={clear}>Limpar filtros</Button> : create}
            />
          ) : (
            <>
              <TableContainer
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}
              >
                <Table
                  aria-label={`${module.Plural}`}
                  sx={{
                    minWidth: 900,
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
                      {[
                        `${module.Singular}`,
                        'Documento',
                        'Contato',
                        'Cidade / UF',
                        'Tipo',
                        'Status',
                        'Ações'
                      ].map((label) => (
                        <TableCell key={label} align={label === 'Ações' ? 'right' : 'left'}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.items.map((customer) => (
                      <TableRow hover key={customer.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: 'surface.secondary',
                                color: 'text.secondary',
                                fontSize: 13
                              }}
                            >
                              {initials(customerName(customer))}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {customerName(customer)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{customerDocument(customer)}</TableCell>
                        <TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 240 }}>
                          <Typography variant="body2">
                            {formatPhone(customer.phone || customer.mobile) || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.email || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {[customer.address.city, customer.address.state].filter(Boolean).join(' / ') || '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              module.commercial
                                ? customer.supplierType || 'Não informado'
                                : typeLabel(customer.type)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EntityStatus status={customer.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={`Visualizar ${module.singular}`}>
                            <IconButton
                              component={Link}
                              to={`${module.path}/${customer.id}`}
                              aria-label={`Visualizar ${module.singular} ${customerName(customer)}`}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={`Editar ${module.singular}`}>
                            <IconButton
                              component={Link}
                              to={`${module.path}/${customer.id}/edit`}
                              aria-label={`Editar ${module.singular} ${customerName(customer)}`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              customer.status === 'ACTIVE'
                                ? `Inativar ${module.singular}`
                                : `Ativar ${module.singular}`
                            }
                          >
                            <IconButton
                              onClick={() => setSelected(customer)}
                              aria-label={`${customer.status === 'ACTIVE' ? 'Inativar' : 'Ativar'} ${module.singular} ${customerName(customer)}`}
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
                    onChange={(e) =>
                      setFilters((old) => ({ ...old, page: 1, pageSize: Number(e.target.value) }))
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
          {selected && (
            <EntityStatusAction key={selected.id} customer={selected} onClose={() => setSelected(null)} />
          )}
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
