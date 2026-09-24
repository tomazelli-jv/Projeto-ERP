import { CreateButton } from '../components/common/CreateButton.jsx';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
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
  Skeleton,
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
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { usersApi } from '../api/users.js';
import { useAuth } from '../app/auth/auth-context.js';
import { useOperationalContext } from '../app/operational-context/operational-context.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { userError, userInitials, userPermissions, userQueryScope } from '../components/users/user-model.js';

// Listagem empresa-scoped: loja integra a chave porque a permissão do JWT pode mudar na troca.
export function UsersPage() {
  const { claims } = useAuth();
  const { isSwitchingStore } = useOperationalContext();
  const permission = userPermissions(claims);
  const scope = userQueryScope(claims);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ pagina: 1, tamanhoPagina: 10, busca: '' });
  const [feedback, setFeedback] = useState(useLocation().state?.userFeedback ?? '');
  useEffect(() => {
    const timeout = setTimeout(() => setFilters((old) => ({ ...old, pagina: 1, busca: search.trim() })), 350);
    return () => clearTimeout(timeout);
  }, [search]);
  const enabled = permission.view && Boolean(claims?.empresaId) && !isSwitchingStore;
  const query = useQuery({
    queryKey: [...scope, 'list', filters],
    queryFn: ({ signal }) => usersApi.list(filters, signal),
    enabled,
    retry: false
  });
  const count = useQuery({
    queryKey: [...scope, 'count'],
    queryFn: ({ signal }) => usersApi.count(signal),
    enabled,
    retry: false
  });
  const createButton = permission.create && (
    <CreateButton component={Link} to="/admin/users/new">
      Novo usuário
    </CreateButton>
  );
  const total = query.data?.total ?? 0;
  const first = total ? (filters.pagina - 1) * filters.tamanhoPagina + 1 : 0;
  return (
    <>
      <PageHeader
        title="Cadastro de usuários"
        description="Gerencie os acessos dos usuários da sua empresa."
      />
      {!permission.view ? (
        <Alert severity="info">Você não possui permissão para visualizar usuários.</Alert>
      ) : !claims?.empresaId ? (
        <Alert severity="info">Selecione um contexto de empresa e loja para consultar usuários.</Alert>
      ) : (
        <>
          {/* A API não fornece contadores de status: não extrapolamos a página atual. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
              gap: 2,
              mb: 3
            }}
          >
            {/* Cores semânticas identificam os indicadores; ausência de contrato nunca vira zero fictício. */}
            {[
              ['Total de usuários', GroupsOutlinedIcon, 'info'],
              ['Usuários ativos', PersonOutlineIcon, 'success'],
              ['Pendentes', ScheduleOutlinedIcon, 'warning'],
              ['Usuários inativos', PersonOffOutlinedIcon, 'error']
            ].map(([label, Icon, tone], index) => (
              <Card
                key={label}
                sx={{ borderRadius: 2, bgcolor: tone + '.soft', borderColor: tone + '.main' }}
              >
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}
                >
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
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={650}>
                      {label}
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 0.5 }}>
                      {index === 0 ? (count.data ?? '—') : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {index === 0 ? 'Na empresa atual' : 'Indicador indisponível'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Box>
            <Box>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                gap={2}
                alignItems={{ sm: 'center' }}
                sx={{ mb: 3 }}
              >
                <TextField
                  fullWidth
                  label="Buscar por nome"
                  placeholder="Digite o nome do usuário..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Box
                  sx={{
                    flexShrink: 0,
                    '& .MuiButton-root': { minHeight: 40, width: { xs: '100%', sm: 'auto' } }
                  }}
                >
                  {createButton}
                </Box>
              </Stack>
              {query.isPending || isSwitchingStore ? (
                <Stack role="status" aria-label="Carregando usuários" spacing={1}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} height={48} />
                  ))}
                </Stack>
              ) : query.isError ? (
                <ErrorState description={userError(query.error)} onRetry={() => query.refetch()} />
              ) : !query.data.items.length ? (
                <EmptyState
                  title="Nenhum usuário encontrado"
                  description="Confira a busca ou cadastre um usuário."
                  action={
                    permission.create ? (
                      <CreateButton component={Link} to="/admin/users/new">
                        Cadastrar primeiro usuário
                      </CreateButton>
                    ) : undefined
                  }
                />
              ) : (
                <TableContainer
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
                >
                  <Table
                    size="small"
                    sx={{
                      minWidth: 640,
                      '& th': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        textTransform: 'uppercase',
                        fontSize: 12,
                        fontWeight: 750,
                        py: 2
                      },
                      '& td': { py: 1.75, fontSize: 13 },
                      '& tbody tr:nth-of-type(even)': { bgcolor: 'surface.secondary' },
                      '& tr:last-child td': { borderBottom: 0 }
                    }}
                    aria-label="Usuários"
                  >
                    <TableHead>
                      <TableRow>
                        {['Usuário', 'E-mail', 'Status', 'Ações'].map((label) => (
                          <TableCell key={label} align={label === 'Ações' ? 'right' : 'left'}>
                            {label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {query.data.items.map((user) => (
                        <TableRow key={user.id} hover>
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
                                {userInitials(user.nome)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {user.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.userName || 'Login indisponível'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 300 }}>
                            {user.email || '—'}
                          </TableCell>
                          <TableCell>
                            {user.ativo === null ? (
                              <Chip size="small" label="Indisponível" />
                            ) : (
                              <Chip
                                size="small"
                                label={user.ativo ? 'Ativo' : 'Inativo'}
                                color={user.ativo ? 'success' : 'error'}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Visualizar usuário">
                              <IconButton
                                component={Link}
                                to={`/admin/users/${user.id}`}
                                aria-label={`Visualizar usuário ${user.nome}`}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {permission.update && (
                              <Tooltip title="Editar usuário">
                                <IconButton
                                  component={Link}
                                  to={`/admin/users/${user.id}/edit`}
                                  aria-label={`Editar usuário ${user.nome}`}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {query.isSuccess
                    ? `Mostrando ${Math.min(first, total)} a ${Math.max(0, Math.min(first + query.data.items.length - 1, total))} de ${total} registros`
                    : '—'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    select
                    label="Por página"
                    value={filters.tamanhoPagina}
                    onChange={(event) =>
                      setFilters((old) => ({ ...old, pagina: 1, tamanhoPagina: Number(event.target.value) }))
                    }
                    sx={{ minWidth: 95 }}
                  >
                    {[10, 20, 50].map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    disabled={filters.pagina === 1 || query.isFetching}
                    onClick={() => setFilters((old) => ({ ...old, pagina: old.pagina - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Typography variant="body2">{filters.pagina}</Typography>
                  <Button
                    disabled={query.isFetching || filters.pagina * filters.tamanhoPagina >= total}
                    onClick={() => setFilters((old) => ({ ...old, pagina: old.pagina + 1 }))}
                  >
                    Próxima
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </>
      )}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={() => setFeedback('')}
        message={feedback}
      />
    </>
  );
}
