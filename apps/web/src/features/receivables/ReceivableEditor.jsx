import { formGrid, dialogStyles, secondarySurface } from './receivables-styles.js';
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { MoneyField } from '../../components/business/MoneyField.jsx';
import { formatReceivableMoney as formatMoney } from './receivables-model.js';
import { formatReceivableDate as formatDate } from './receivables-model.js';
import { CreateButton } from '../../components/common/CreateButton.jsx';
import { eligibleCustomer, installmentAt, todayDate, validateInstallments } from './receivables-model.js';
import { useReceivableMutation } from './receivables-queries.js';
import { CustomerPicker } from './ReceivableShared.jsx';

// Prévia paginada evita renderizar milhares de linhas; o repository cria todo o grupo numa gravação.
export function ReceivableEditor({ title, customers, onClose, onSaved }) {
  const editing = Boolean(title);
  const paid = Boolean(title?.paymentCount);
  const [form, setForm] = useState(() =>
    title
      ? { ...title, totalCents: title.originalAmountCents }
      : {
          customerId: '',
          description: '',
          document: '',
          issueDate: todayDate(),
          dueDate: '',
          totalCents: null,
          installmentCount: 1,
          notes: ''
        }
  );
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const mutation = useReceivableMutation();
  const lock = useRef(false);
  const change = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }));
    setPage(0);
  };
  const eligible = customers.filter((c) => eligibleCustomer(c) || (editing && c.id === title.customerId));
  let preview = [];
  let previewError = '';
  if (!editing && form.totalCents != null && form.dueDate) {
    try {
      validateInstallments(form.totalCents, form.installmentCount, form.dueDate);
      preview = Array.from({ length: Math.min(5, form.installmentCount - page * 5) }, (_, index) =>
        installmentAt(form.totalCents, form.installmentCount, form.dueDate, page * 5 + index)
      );
    } catch (failure) {
      previewError = failure.message;
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await mutation.mutateAsync({
        operation: editing ? 'update' : 'create',
        id: title?.id,
        data: { ...form, originalAmountCents: form.totalCents }
      });
      onSaved(editing ? 'Título atualizado.' : 'Título cadastrado.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      lock.current = false;
    }
  }
  const field = (key, label, required = false, type = 'text', disabled = false) => (
    <TextField
      label={label}
      required={required}
      type={type}
      disabled={disabled}
      value={form[key]}
      onChange={(e) => change(key, e.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 300 } }}
    />
  );
  return (
    <Dialog
      sx={dialogStyles}
      open
      fullWidth
      maxWidth="md"
      onClose={mutation.isPending ? undefined : onClose}
      aria-labelledby="receivable-editor-title"
    >
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogTitle id="receivable-editor-title">
          {editing ? 'Editar título' : 'Novo título a receber'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {!eligible.length && (
              <Alert severity="info">
                Habilite “Permitir contas a receber” em um cliente ativo antes de cadastrar um título.
              </Alert>
            )}
            {paid && (
              <Alert severity="info">
                Este título possui recebimentos. Cliente, emissão e valor original estão preservados.
              </Alert>
            )}
            <Box
              component="fieldset"
              disabled={mutation.isPending}
              sx={{ ...formGrid, p: 0, m: 0, border: 0, minWidth: 0 }}
            >
              <CustomerPicker
                customers={eligible}
                required
                value={form.customerId}
                onChange={(value) => change('customerId', value)}
                disabled={paid}
              />
              {field('description', 'Descrição', true)}
              {field('document', 'Documento')}
              {field('issueDate', 'Data de emissão', true, 'date', paid)}
              {field('dueDate', editing ? 'Vencimento' : 'Primeiro vencimento', true, 'date')}
              {paid ? (
                <TextField label="Valor original" value={formatMoney(form.totalCents)} disabled />
              ) : (
                <MoneyField
                  label={editing ? 'Valor original' : 'Valor total'}
                  required
                  value={form.totalCents}
                  onChange={(value) => change('totalCents', value)}
                />
              )}
              {!editing && (
                <TextField
                  required
                  label="Número de parcelas"
                  type="number"
                  value={form.installmentCount}
                  onChange={(e) =>
                    change('installmentCount', e.target.value === '' ? '' : Number(e.target.value))
                  }
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
              )}
              <TextField
                label="Observação"
                multiline
                minRows={2}
                value={form.notes}
                onChange={(e) => change('notes', e.target.value)}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
            </Box>
            {previewError && <Alert severity="warning">{previewError}</Alert>}
            {preview.length > 0 && (
              <Box sx={secondarySurface}>
                <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
                  Prévia das parcelas
                </Typography>
                <TableContainer>
                  <Table size="small" aria-label="Prévia das parcelas">
                    <TableHead>
                      <TableRow>
                        {['Parcela', 'Vencimento', 'Valor'].map((label) => (
                          <TableCell key={label}>{label}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.map((p) => (
                        <TableRow key={p.installmentNumber}>
                          <TableCell>
                            {p.installmentNumber}/{p.installmentCount}
                          </TableCell>
                          <TableCell>{formatDate(p.dueDate)}</TableCell>
                          <TableCell>{formatMoney(p.originalAmountCents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {form.installmentCount > 5 && (
                  <TablePagination
                    component="div"
                    count={form.installmentCount}
                    page={page}
                    rowsPerPage={5}
                    rowsPerPageOptions={[5]}
                    onPageChange={(_, value) => setPage(value)}
                  />
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <CreateButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar título'}
          </CreateButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
ReceivableEditor.propTypes = {
  title: PropTypes.object,
  customers: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};
