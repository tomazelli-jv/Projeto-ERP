import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../app/auth/auth-context.js';
import { employeeAccess } from '../app/auth/permissions.js';
import { useOperationalContext } from '../app/operational-context/operational-context.js';
import { employeeError, employeeScope } from '../api/employees-contract.js';
import { useEmployees } from '../hooks/useEmployees.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmployeeDialog } from '../components/users/EmployeeDialog.jsx';

// Mudanças de sessão, empresa ou permissões descartam rascunhos; loja não é filtro da listagem.
export function EmployeesPage() {
  const { claims, status } = useAuth();
  const access = employeeAccess(claims, status);
  return <EmployeesContent key={JSON.stringify([employeeScope(claims), access])} />;
}

function EmployeesContent() {
  const { claims } = useAuth();
  const context = useOperationalContext();
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '' });
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [feedback, setFeedback] = useState('');
  const { query, access, enabled } = useEmployees(filters, context.isSwitchingStore);
  // Debounce altera busca e página atomicamente para não consultar a nova busca numa página antiga.
  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setFilters((current) =>
          current.search === search.trim() ? current : { ...current, page: 1, search: search.trim() }
        ),
      400
    );
    return () => clearTimeout(timeout);
  }, [search]);
  const stores = context.stores.filter(
    (store) => store.ativo && String(store.empresaId) === String(claims?.empresaId)
  );
  const canCreate = enabled && access.create && !context.isLoading && !context.error && stores.length > 0;
  const data = query.data;
  const newButton = canCreate ? (
    <Button variant="contained" onClick={() => setDialog({ mode: 'create' })}>
      Novo funcionário
    </Button>
  ) : undefined;
  return (
    <>
      <PageHeader
        title="Funcionários"
        description="Gerencie os colaboradores e seus acessos ao sistema."
        action={newButton}
      />
      {!access.view ? (
        <Alert severity="info">Você não possui permissão para visualizar funcionários.</Alert>
      ) : !claims?.empresaId ? (
        <Alert severity="info">Sua sessão não possui empresa vinculada.</Alert>
      ) : (
        <>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            Funcionários da empresa da sessão, independentemente da loja ativa.
          </Typography>
          {access.create && !canCreate && !context.isSwitchingStore && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Cadastro indisponível até que haja uma loja inicial acessível da empresa no contexto
              operacional.
            </Alert>
          )}
          <SectionCard>
            <TextField
              fullWidth
              label="Buscar funcionário"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ minHeight: 4 }}>
              {query.isFetching && <LinearProgress aria-label="Atualizando funcionários" />}
            </Box>
            {data?.pageSizeFallback && (
              <Alert severity="warning" sx={{ my: 2 }}>
                A API não informou um tamanho de página válido. Exibindo a paginação com o tamanho solicitado.
              </Alert>
            )}
            {query.isError ? (
              <ErrorState description={employeeError(query.error)} onRetry={query.refetch} />
            ) : query.isPending || context.isSwitchingStore ? (
              <Stack spacing={1} aria-label="Carregando funcionários" aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} variant="rounded" height={52} />
                ))}
              </Stack>
            ) : data.itens.length === 0 ? (
              <EmptyState
                title={
                  filters.search
                    ? 'Nenhum funcionário encontrado'
                    : filters.page > 1
                      ? 'Nenhum funcionário nesta página'
                      : 'Nenhum funcionário cadastrado'
                }
                description={
                  filters.search ? 'Tente outra busca.' : 'Os cadastros disponíveis aparecerão aqui.'
                }
                action={canCreate ? newButton : undefined}
              />
            ) : (
              <TableContainer>
                <Table aria-label="Funcionários da empresa" size="small">
                  <TableHead>
                    <TableRow>
                      {['Nome', 'Usuário', 'E-mail', 'Status', 'Vínculos', 'Ações'].map((label) => (
                        <TableCell
                          key={label}
                          sx={label === 'E-mail' ? { display: { xs: 'none', md: 'table-cell' } } : {}}
                        >
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.itens.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell component="th" scope="row" sx={{ overflowWrap: 'anywhere' }}>
                          {employee.nome}
                        </TableCell>
                        <TableCell sx={{ overflowWrap: 'anywhere' }}>{employee.userName}</TableCell>
                        <TableCell
                          sx={{ display: { xs: 'none', md: 'table-cell' }, overflowWrap: 'anywhere' }}
                        >
                          {employee.email}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={employee.ativo ? 'Ativo' : 'Inativo'}
                            color={employee.ativo ? 'success' : 'default'}
                          />
                        </TableCell>
                        {/* Quantidade de vínculos; nunca tratamos IDs de vínculo como IDs ou nomes de lojas. */}
                        <TableCell>{employee.idVinculosLoja.length} vínculos</TableCell>
                        <TableCell>
                          <Stack direction={{ xs: 'column', sm: 'row' }}>
                            <Button
                              aria-label={`Consultar ${employee.nome}`}
                              onClick={() => setDialog({ mode: 'detail', id: employee.id })}
                            >
                              Detalhes
                            </Button>
                            {access.update && (
                              <Button
                                aria-label={`Editar ${employee.nome}`}
                                onClick={() => setDialog({ mode: 'edit', id: employee.id })}
                              >
                                Editar
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {/* Nunca inventa total ou pagina toda a coleção no navegador. */}
            {data && !query.isError && (
              <TablePagination
                component="div"
                count={data.totalRegistros}
                page={filters.page - 1}
                rowsPerPage={filters.pageSize}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                getItemAriaLabel={(type) =>
                  ({
                    first: 'Primeira página',
                    last: 'Última página',
                    next: 'Próxima página',
                    previous: 'Página anterior'
                  })[type]
                }
                onPageChange={(_, page) => setFilters((current) => ({ ...current, page: page + 1 }))}
                onRowsPerPageChange={(event) =>
                  setFilters((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) }))
                }
              />
            )}
          </SectionCard>
          {dialog && !context.isSwitchingStore && (dialog.mode !== 'create' || canCreate) && (
            <EmployeeDialog
              {...dialog}
              stores={stores}
              onClose={() => setDialog(null)}
              onSuccess={(message) => {
                setDialog(null);
                setFeedback(message);
              }}
            />
          )}
        </>
      )}
      <Snackbar open={Boolean(feedback)} autoHideDuration={5000} onClose={() => setFeedback('')}>
        <Alert severity="success" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      </Snackbar>
    </>
  );
}
