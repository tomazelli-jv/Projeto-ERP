import { useSearchParams } from 'react-router';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  pageStyles,
  newTitleStyles,
  summaryCardStyles,
  tableStyles,
  actionStyles,
  dialogStyles
} from '../features/receivables/receivables-styles.js';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Pagination,
  InputAdornment,
  TableSortLabel,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { ErrorState } from '../components/feedback/ErrorState.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { formatReceivableMoney as formatMoney } from '../features/receivables/receivables-model.js';
import { formatReceivableDate as formatDate } from '../features/receivables/receivables-model.js';
import { customerName } from '../features/customers/customer-model.js';
import { monthPeriod, statusLabels } from '../features/receivables/receivables-model.js';
import {
  useReceivable,
  useReceivableCustomers,
  useReceivableMutation,
  useReceivables,
  useReceivableSummary
} from '../features/receivables/receivables-queries.js';
import { CustomerPicker, ReceivableStatus } from '../features/receivables/ReceivableShared.jsx';
import { ReceivableEditor } from '../features/receivables/ReceivableEditor.jsx';
import { ReceiveDialog } from '../features/receivables/ReceiveDialog.jsx';
import { ReceivableDetail } from '../features/receivables/ReceivableDetail.jsx';

const defaults = () => ({
  customerId: '',
  status: '',
  dueFrom: '',
  dueTo: '',
  search: '',
  searchField: 'name',
  sortBy: 'dueDate',
  sortDirection: 'asc',
  ...monthPeriod(),
  page: 1,
  pageSize: 10
});
// Tela financeira própria: filtros locais não recarregam a página e queries mantêm o escopo da sessão.
export function ReceivablesPage() {
  const [params] = useSearchParams();
  const linkedStatus = params.get('status');
  const [filters, setFilters] = useState(() => ({
    ...defaults(),
    status: Object.hasOwn(statusLabels, linkedStatus) ? linkedStatus : ''
  }));
  // Deep link aplica somente os status ja suportados, sem inventar filtros de negocio.
  useEffect(() => {
    if (Object.hasOwn(statusLabels, linkedStatus))
      setFilters((old) => ({ ...old, status: linkedStatus, page: 1 }));
  }, [linkedStatus]);
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState('name');
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((old) => ({ ...old, search, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useReceivables(filters);
  const summary = useReceivableSummary(filters);
  const customers = useReceivableCustomers();
  const detail = useReceivable(selected?.id);
  const mutation = useReceivableMutation();
  const change = (key, value) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const saved = (message) => {
    setSelected(null);
    setFeedback({ message, severity: 'success' });
  };
  const close = () => setSelected(null);
  async function cancel() {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync({ operation: 'cancel', id: selected.id });
      saved('Título cancelado.');
    } catch (error) {
      setFeedback({ message: error.message, severity: 'error' });
    }
  }
  const create = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setSelected({ action: 'create' })}
      sx={newTitleStyles}
    >
      Novo título
    </Button>
  );
  const title = detail.data;
  const invalidPeriod =
    (filters.dueFrom && filters.dueTo && filters.dueFrom > filters.dueTo) ||
    filters.receivedFrom > filters.receivedTo;
  return (
    <Box sx={pageStyles}>
      <PageHeader
        action={import.meta.env.DEV ? create : null}
        title="Contas a Receber"
        description="Acompanhe e gerencie os valores a receber dos clientes."
      />
      {!import.meta.env.DEV ? (
        <EmptyState
          title="Aguardando integração"
          description="Contas a Receber estará disponível quando o backend financeiro for conectado."
        />
      ) : (
        <Stack spacing={2.5}>
          {summary.isError ? (
            <ErrorState description={summary.error.message} onRetry={summary.refetch} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
                gap: 2
              }}
            >
              {[
                ['due', 'A vencer', 'info', AccountBalanceWalletOutlinedIcon],
                ['overdue', 'Vencidos', 'error', AccessTimeIcon],
                ['received', 'Recebidos no período', 'success', CheckCircleOutlineIcon],
                ['outstanding', 'Saldo total a receber', 'warning', PaymentsOutlinedIcon]
              ].map(([key, label, color, Icon], index) => (
                <Card key={key} sx={summaryCardStyles(color, index)}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 118, px: 2.5 }}
                  >
                    <Box
                      className="summary-icon"
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 44,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 1,
                        fontSize: 22
                      }}
                    >
                      <Icon />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" color="inherit" fontWeight={600}>
                        {label}
                      </Typography>
                      {summary.data ? (
                        <>
                          <Typography
                            variant="h2"
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              my: 1,
                              fontSize: { xs: 24, xl: 28 },
                              color: 'inherit',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            {formatMoney(summary.data[key].amount)}
                          </Typography>
                          <Typography variant="caption" color="inherit" sx={{ opacity: 0.9 }}>
                            {summary.data[key].count} {key === 'received' ? 'recebimentos' : 'títulos'}
                          </Typography>
                        </>
                      ) : (
                        <Skeleton height={64} />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          {customers.isError && (
            <ErrorState description={customers.error.message} onRetry={customers.refetch} />
          )}
          {/* A faixa permanece em uma linha no desktop; o seletor troca apenas o campo de pesquisa. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                lg: 'minmax(150px,1fr) minmax(260px,3.4fr) minmax(150px,1fr) auto'
              },
              gap: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              alignItems: 'center'
            }}
          >
            <TextField
              select
              label="Filtro"
              value={filterKind}
              onChange={(e) => {
                const value = e.target.value;
                setFilterKind(value);
                if (['name', 'document', 'description'].includes(value)) change('searchField', value);
              }}
            >
              {[
                ['name', 'Nome'],
                ['document', 'Documento'],
                ['description', 'Descrição'],
                ['customer', 'Cliente'],
                ['due', 'Vencimento'],
                ['received', 'Período de recebimentos']
              ].map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {['name', 'document', 'description'].includes(filterKind) ? (
              <TextField
                label="Busca"
                placeholder="Digite sua busca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            ) : filterKind === 'customer' ? (
              <CustomerPicker
                customers={customers.data ?? []}
                value={filters.customerId}
                onChange={(v) => change('customerId', v)}
              />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {(filterKind === 'due'
                  ? [
                      ['dueFrom', 'Vencimento inicial'],
                      ['dueTo', 'Vencimento final']
                    ]
                  : [
                      ['receivedFrom', 'Recebimentos de'],
                      ['receivedTo', 'Recebimentos até']
                    ]
                ).map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label}
                    type="date"
                    value={filters[key]}
                    onChange={(e) => change(key, e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                ))}
              </Box>
            )}
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => change('status', e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={() => {
                setSearch('');
                setFilterKind('name');
                setFilters(defaults());
              }}
              sx={{ minHeight: 40, whiteSpace: 'nowrap' }}
            >
              Limpar filtros
            </Button>
          </Box>
          {invalidPeriod && (
            <Alert severity="warning">A data inicial deve ser anterior ou igual à data final.</Alert>
          )}
          {list.isPending ? (
            <Skeleton variant="rounded" height={320} />
          ) : list.isError ? (
            <ErrorState description={list.error.message} onRetry={list.refetch} />
          ) : !list.data?.items.length ? (
            <EmptyState
              title="Nenhum título a receber encontrado."
              description="Cadastre um título ou revise os filtros selecionados."
              action={create}
            />
          ) : (
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Títulos encontrados
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ px: 1, py: 0.25, bgcolor: 'action.hover', borderRadius: 2 }}
                >
                  {list.data.total}
                </Typography>
              </Stack>
              <TableContainer sx={tableStyles}>
                <Table size="small" sx={{ minWidth: 1150 }} aria-label="Contas a Receber">
                  <TableHead>
                    <TableRow>
                      {[
                        'Cliente',
                        'Documento',
                        'Parcela',
                        'Emissão',
                        'Vencimento',
                        'Valor original',
                        'Saldo',
                        'Status',
                        'Ações'
                      ].map((label, index) => {
                        const key = [
                          'customer',
                          'document',
                          'installmentNumber',
                          'issueDate',
                          'dueDate',
                          'originalAmountCents',
                          'balanceCents',
                          'status'
                        ][index];
                        return (
                          <TableCell key={label}>
                            {key ? (
                              <TableSortLabel
                                active={filters.sortBy === key}
                                direction={filters.sortBy === key ? filters.sortDirection : 'asc'}
                                onClick={() =>
                                  setFilters((old) => ({
                                    ...old,
                                    sortBy: key,
                                    sortDirection:
                                      old.sortBy === key && old.sortDirection === 'asc' ? 'desc' : 'asc',
                                    page: 1
                                  }))
                                }
                              >
                                {label}
                              </TableSortLabel>
                            ) : (
                              label
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.data.items.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ maxWidth: 230, overflowWrap: 'anywhere', fontWeight: 600 }}>
                          {row.customer ? customerName(row.customer) : 'Cliente indisponível'}
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                            sx={{ fontWeight: 400, mt: 0.25 }}
                          >
                            {row.description}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.document || '—'}</TableCell>
                        <TableCell>
                          {row.installmentNumber}/{row.installmentCount}
                        </TableCell>
                        <TableCell>{formatDate(row.issueDate)}</TableCell>
                        <TableCell sx={{ color: row.status === 'OVERDUE' ? 'error.main' : 'text.primary' }}>
                          {formatDate(row.dueDate)}
                        </TableCell>
                        <TableCell>{formatMoney(row.originalAmountCents)}</TableCell>
                        <TableCell sx={{ color: row.balanceCents === 0 ? 'text.secondary' : 'text.primary' }}>
                          {formatMoney(row.balanceCents)}
                        </TableCell>
                        <TableCell>
                          <ReceivableStatus status={row.status} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row">
                            {[
                              ['view', 'Visualizar', VisibilityOutlinedIcon, false],
                              ['edit', 'Editar', EditOutlinedIcon, row.status === 'CANCELED'],
                              [
                                'receive',
                                'Receber',
                                PaymentsOutlinedIcon,
                                ['CANCELED', 'PAID'].includes(row.status)
                              ],
                              ['cancel', 'Cancelar título', BlockOutlinedIcon, row.status === 'CANCELED']
                            ].map(([action, label, Icon, disabled]) => (
                              <Tooltip key={action} title={label}>
                                <span>
                                  <IconButton
                                    size="small"
                                    sx={actionStyles(action)}
                                    disabled={disabled}
                                    aria-label={`${label} ${row.document || row.description}`}
                                    onClick={() => setSelected({ action, id: row.id })}
                                  >
                                    <Icon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                sx={{ px: 1.5, py: 1.5 }}
              >
                <Typography variant="caption" color="text.secondary">
                  Mostrando {(list.data.page - 1) * list.data.pageSize + 1} a{' '}
                  {Math.min(list.data.page * list.data.pageSize, list.data.total)} de {list.data.total}{' '}
                  títulos
                </Typography>
                <Stack direction="row" alignItems="center" gap={2}>
                  <TextField
                    select
                    size="small"
                    label="Itens por página"
                    value={filters.pageSize}
                    onChange={(e) => change('pageSize', Number(e.target.value))}
                    sx={{ minWidth: 100 }}
                  >
                    {[5, 10, 25, 50].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Pagination
                    count={Math.ceil(list.data.total / list.data.pageSize)}
                    page={list.data.page}
                    onChange={(_, page) => setFilters((old) => ({ ...old, page }))}
                    color="primary"
                    size="small"
                    siblingCount={0}
                  />
                </Stack>
              </Stack>
            </Box>
          )}
          <Alert severity="info" sx={{ py: 0, typography: 'caption' }}>
            Demonstração local — Contas a Receber ainda não está integrado ao backend. Use apenas dados
            fictícios; títulos e recebimentos ficam neste navegador.
          </Alert>
        </Stack>
      )}
      {selected?.action === 'create' && (
        <ReceivableEditor customers={customers.data ?? []} onClose={close} onSaved={saved} />
      )}
      {selected?.id && (detail.isPending || detail.isError || !title) && (
        <Dialog sx={dialogStyles} open fullWidth onClose={close} aria-labelledby="receivable-load-title">
          <DialogTitle id="receivable-load-title">Título a receber</DialogTitle>
          <DialogContent>
            {detail.isPending ? (
              <Skeleton height={200} />
            ) : (
              <ErrorState
                description={detail.error?.message ?? 'Título não encontrado.'}
                onRetry={detail.refetch}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Fechar</Button>
          </DialogActions>
        </Dialog>
      )}
      {selected?.id && title && selected.action === 'view' && (
        <ReceivableDetail title={title} onClose={close} />
      )}
      {selected?.id && title && selected.action === 'edit' && (
        <ReceivableEditor title={title} customers={customers.data ?? []} onClose={close} onSaved={saved} />
      )}
      {selected?.id && title && selected.action === 'receive' && (
        <ReceiveDialog title={title} onClose={close} onSaved={saved} />
      )}
      {selected?.id &&
        title &&
        selected.action === 'cancel' &&
        (title.paymentCount ? (
          <Dialog open onClose={close} aria-labelledby="cancel-blocked">
            <DialogTitle id="cancel-blocked">Cancelamento indisponível</DialogTitle>
            <DialogContent>
              Este título possui recebimentos registrados e não pode ser cancelado sem estorno.
            </DialogContent>
            <DialogActions>
              <Button onClick={close}>Voltar</Button>
            </DialogActions>
          </Dialog>
        ) : (
          <ConfirmDialog
            sx={dialogStyles}
            open
            title="Cancelar título?"
            description="O título permanecerá registrado e deixará de compor o saldo a receber."
            confirmLabel="Cancelar título"
            cancelLabel="Voltar"
            loading={mutation.isPending}
            onClose={close}
            onConfirm={cancel}
          />
        ))}
      <Snackbar open={Boolean(feedback)} autoHideDuration={6000} onClose={() => setFeedback(null)}>
        <Alert severity={feedback?.severity ?? 'success'} onClose={() => setFeedback(null)}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
