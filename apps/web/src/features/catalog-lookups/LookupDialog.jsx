import { ThemeProvider, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { createLookupTheme } from './lookup-theme.js';
import { CancelButton } from '../../components/common/CancelButton';
import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { CnpjField } from '../../components/business/CnpjField.jsx';
import { CreateButton } from '../../components/common/CreateButton.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { LoadingState } from '../../components/feedback/LoadingState.jsx';
import { ErrorState } from '../../components/feedback/ErrorState.jsx';
import { useLookupList, useLookupSource, useLookupMutation } from './lookup-queries.js';

// Pode ser montado pela navbar ou pelo Produto. A chave de escopo impede reaproveitar rascunhos entre empresas.
export function LookupDialog({ open, onClose, module }) {
  const { owner } = useLookupSource(module);
  const base = useTheme();
  const lookupTheme = useMemo(() => createLookupTheme(base), [base]);
  return open ? (
    <ThemeProvider theme={lookupTheme}>
      <LookupManager key={`${module.key}:${owner}`} onClose={onClose} module={module} />
    </ThemeProvider>
  ) : null;
}
LookupDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  module: PropTypes.object.isRequired
};

function LookupManager({ onClose, module }) {
  const [form, setForm] = useState(null);
  const [filters, setFilters] = useState({ field: module.fields[0].key, match: 'contains', search: '' });
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirm, setConfirm] = useState(null);
  const lock = useRef(false);
  const { enabled } = useLookupSource(module);
  const query = useLookupList(module, filters);
  const mutation = useLookupMutation(module);
  const mobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const busy = mutation.isPending;
  const title = form ? (form.id ? module.editTitle : module.createTitle) : module.title;
  const rows = query.data?.items ?? [];
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 10) - 1));
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const back = () => {
    setForm(null);
    setError('');
  };
  async function save(payload) {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await mutation.mutateAsync(payload);
      setConfirm(null);
      setForm(null);
      setSuccess(module.success);
    } catch (e) {
      setConfirm(null);
      setError(e.message);
    } finally {
      lock.current = false;
    }
  }
  function submit(event) {
    event.preventDefault();
    // Portais propagam eventos React: o cadastro rápido não deve submeter o formulário do Produto.
    event.stopPropagation();
    try {
      module.prepare(form);
    } catch (e) {
      setError(e.message);
      return;
    }
    const payload = { operation: form.id ? 'update' : 'create', id: form.id, data: form };
    if (form.id && form.originalActive && !form.active) setConfirm(payload);
    else save(payload);
  }
  return (
    <Dialog
      open
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: { maxWidth: 780, width: 'calc(100% - 32px)', m: 2, maxHeight: 'calc(100% - 32px)' } }
      }}
      onClose={busy ? undefined : () => (form ? back() : onClose())}
      aria-labelledby={`${module.key}-title`}
      aria-describedby={`${module.key}-description`}
      transitionDuration={reduced ? 0 : 180}
    >
      <DialogTitle id={`${module.key}-title`} sx={{ pr: 7 }}>
        {title}
        <IconButton
          aria-label="Fechar consulta"
          disabled={busy}
          onClick={onClose}
          sx={{ position: 'absolute', right: 16, top: 16 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography component="p" variant="body2" color="text.secondary" id={`${module.key}-description`}>
          {form ? module.formDescription : module.subtitle}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ minHeight: mobile ? undefined : 380 }}>
        {!enabled ? (
          <Alert severity="info">{module.unavailable}</Alert>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {module.notice}
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            <Box
              key={form ? (form.id ?? 'new') : 'list'}
              sx={{
                animation: reduced ? 'none' : 'brand-entry 180ms ease-out',
                '@keyframes brand-entry': {
                  from: { opacity: 0, transform: 'translateY(4px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {form ? (
                <Box component="form" id={`${module.key}-form`} onSubmit={submit} noValidate>
                  <Box component="fieldset" disabled={busy} sx={{ border: 0, p: 0, m: 0 }}>
                    <Stack spacing={2.5}>
                      {module.fields.map((field, index) =>
                        field.type === 'cnpj' ? (
                          <CnpjField
                            key={field.key}
                            value={form[field.key]}
                            onChange={(value) => change(field.key, value)}
                          />
                        ) : (
                          <TextField
                            key={field.key}
                            autoFocus={index === 0}
                            label={field.label}
                            required={field.required}
                            fullWidth
                            multiline={field.multiline}
                            minRows={field.multiline ? 3 : undefined}
                            value={form[field.key]}
                            onChange={(e) =>
                              change(
                                field.key,
                                field.normalizeInput
                                  ? field.normalizeInput(e.target.value)
                                  : field.uppercase
                                    ? e.target.value.toUpperCase()
                                    : e.target.value
                              )
                            }
                            slotProps={{
                              htmlInput: { maxLength: field.maxLength, inputMode: field.inputMode }
                            }}
                          />
                        )
                      )}
                      <TextField
                        select
                        label="Status"
                        value={form.active ? 'active' : 'inactive'}
                        onChange={(e) => change('active', e.target.value === 'active')}
                      >
                        <MenuItem value="active">{module.activeLabel}</MenuItem>
                        <MenuItem value="inactive">{module.inactiveLabel}</MenuItem>
                      </TextField>
                    </Stack>
                  </Box>
                </Box>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      select
                      label="Pesquisar por"
                      value={filters.field}
                      sx={{ minWidth: 160 }}
                      onChange={(e) => {
                        setFilters({ ...filters, field: e.target.value });
                        setPage(0);
                      }}
                    >
                      {module.fields.map((field) => (
                        <MenuItem key={field.key} value={field.key}>
                          {field.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Correspondência"
                      value={filters.match}
                      sx={{ minWidth: 175 }}
                      onChange={(e) => {
                        setFilters({ ...filters, match: e.target.value });
                        setPage(0);
                      }}
                    >
                      <MenuItem value="contains">Contém</MenuItem>
                      <MenuItem value="starts">Começa com</MenuItem>
                      <MenuItem value="equals">Igual a</MenuItem>
                    </TextField>
                    <TextField
                      autoFocus
                      fullWidth
                      label="Dados a pesquisar"
                      value={filters.search}
                      onChange={(e) => {
                        setFilters({ ...filters, search: e.target.value });
                        setPage(0);
                      }}
                    />
                  </Stack>
                  {query.isPending ? (
                    <LoadingState message={module.loading} />
                  ) : query.isError ? (
                    <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
                  ) : (
                    <>
                      <TableContainer>
                        <Table
                          size="small"
                          aria-label={module.tableLabel}
                          sx={{
                            width: '100%',
                            '& .lookup-secondary': { display: { xs: 'none', sm: 'table-cell' } }
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              {[
                                ...(module.showInternalCode === false ? [] : ['Código']),
                                ...module.fields.map((field) => field.columnLabel ?? field.label),
                                'Status',
                                'Ações'
                              ].map((label) => (
                                <TableCell
                                  key={label}
                                  className={
                                    label === 'Código' ||
                                    module.fields
                                      .slice(module.showInternalCode === false ? 2 : 1)
                                      .some((field) => (field.columnLabel ?? field.label) === label)
                                      ? 'lookup-secondary'
                                      : undefined
                                  }
                                >
                                  {label}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.slice(currentPage * 10, currentPage * 10 + 10).map((row) => (
                              <TableRow key={row.id} hover>
                                {module.showInternalCode !== false && (
                                  <TableCell className="lookup-secondary">{row.code}</TableCell>
                                )}
                                {module.fields.map((field, index) => (
                                  <TableCell
                                    className={
                                      index >= (module.showInternalCode === false ? 2 : 1)
                                        ? 'lookup-secondary'
                                        : undefined
                                    }
                                    key={field.key}
                                    sx={{ maxWidth: 360, overflowWrap: 'anywhere' }}
                                  >
                                    {(field.format ? field.format(row[field.key]) : row[field.key]) || '—'}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={row.active ? 'success' : 'error'}
                                    label={row.active ? module.activeLabel : module.inactiveLabel}
                                  />
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  <Tooltip title="Editar">
                                    <span>
                                      <IconButton
                                        disabled={busy}
                                        aria-label={`Editar ${row[module.fields[0].key]}`}
                                        onClick={() => {
                                          setForm({ ...row, originalActive: row.active });
                                          setError('');
                                          setSuccess('');
                                        }}
                                      >
                                        <EditOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title={row.active ? 'Inativar' : 'Ativar'}>
                                    <span>
                                      <IconButton
                                        disabled={busy}
                                        aria-label={`${row.active ? 'Inativar' : 'Ativar'} ${row[module.fields[0].key]}`}
                                        onClick={() => {
                                          const payload = {
                                            operation: 'setActive',
                                            id: row.id,
                                            active: !row.active
                                          };
                                          if (row.active) setConfirm(payload);
                                          else save(payload);
                                        }}
                                      >
                                        {row.active ? (
                                          <BlockIcon fontSize="small" />
                                        ) : (
                                          <CheckCircleOutlineIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                            {!rows.length && (
                              <TableRow>
                                <TableCell
                                  colSpan={module.fields.length + (module.showInternalCode === false ? 2 : 3)}
                                >
                                  {module.emptyMessage}
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Revise a pesquisa ou adicione um registro.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={rows.length}
                        page={currentPage}
                        rowsPerPage={10}
                        rowsPerPageOptions={[10]}
                        onPageChange={(_, value) => setPage(value)}
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                      />
                    </>
                  )}
                </>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          p: 2,
          gap: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          '& > .MuiButton-root': { ml: 0 }
        }}
      >
        <CancelButton variant="outlined" active={!form} disabled={busy} onClick={form ? back : onClose}>
          {form ? 'Voltar' : 'Cancelar'}
        </CancelButton>
        {enabled &&
          (form ? (
            <Button disabled={busy} type="submit" form={`${module.key}-form`} variant="contained">
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
          ) : (
            <CreateButton
              disabled={busy || query.isError}
              onClick={() => {
                setForm(module.empty());
                setError('');
                setSuccess('');
              }}
            >
              {module.createTitle}
            </CreateButton>
          ))}
      </DialogActions>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={module.confirmTitle}
        description={module.confirmDescription}
        confirmLabel="Inativar"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => save(confirm)}
      />
    </Dialog>
  );
}
LookupManager.propTypes = { onClose: PropTypes.func.isRequired, module: PropTypes.object.isRequired };
