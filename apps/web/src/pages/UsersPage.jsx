import AddIcon from '@mui/icons-material/Add';
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
    <Button component={Link} to="/admin/users/new" variant="contained" startIcon={<AddIcon />}>
      Novo usuário
    </Button>
  );
  const total = query.data?.total ?? 0;
  const first = total ? (filters.pagina - 1) * filters.tamanhoPagina + 1 : 0;
  return (
    <>
      <PageHeader title="Usuários" description="Gerencie os usuários do seu sistema." action={createButton} />
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
            {['Total de usuários', 'Usuários ativos', 'Pendentes', 'Usuários inativos'].map(
              (label, index) => (
                <Card key={label}>
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">
                      {label}
                    </Typography>
                    <Typography variant="h2" sx={{ my: 1 }}>
                      {index === 0 ? (count.data ?? '—') : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {index === 0 ? 'Na empresa atual' : 'Indicador indisponível'}
                    </Typography>
                  </CardContent>
                </Card>
              )
            )}
          </Box>
          <Card>
            <CardContent>
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
                sx={{ mb: 2, maxWidth: 600 }}
              />
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
                      <Button component={Link} to="/admin/users/new">
                        Cadastrar primeiro usuário
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <TableContainer>
                  <Table sx={{ minWidth: 640 }} aria-label="Usuários">
                    <TableHead>
                      <TableRow>
                        {['Usuário', 'E-mail', 'Status', 'Ações'].map((label) => (
                          <TableCell key={label}>{label}</TableCell>
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
                                  bgcolor: 'primary.soft',
                                  color: 'primary.dark',
                                  fontSize: 13
                                }}
                              >
                                {userInitials(user.nome)}
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600}>{user.nome}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.userName || 'Login indisponível'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{user.email || '—'}</TableCell>
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
                          <TableCell>
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
            </CardContent>
          </Card>
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
