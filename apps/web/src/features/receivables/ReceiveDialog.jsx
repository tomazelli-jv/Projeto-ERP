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
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { MoneyField } from '../../components/business/MoneyField.jsx';
import { formatReceivableMoney as formatMoney } from './receivables-model.js';
import { paymentTotal, todayDate } from './receivables-model.js';
import { usePaymentMethods, useReceivableMutation } from './receivables-queries.js';
import { TitleOverview } from './ReceivableShared.jsx';

// A baixa quita principal; encargos/desconto afetam somente o dinheiro recebido e não o saldo restante.
export function ReceiveDialog({ title, onClose, onSaved }) {
  const [form, setForm] = useState({
    receivedAt: todayDate(),
    amountAppliedCents: title.balanceCents,
    discountCents: 0,
    interestCents: 0,
    penaltyCents: 0,
    paymentMethodId: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mutation = useReceivableMutation();
  const methods = usePaymentMethods();
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  let total;
  try {
    total = paymentTotal(form);
  } catch {
    total = null;
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await mutation.mutateAsync({ operation: 'receive', id: title.id, data: form });
      onSaved('Recebimento registrado.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      lock.current = false;
    }
  }
  return (
    <Dialog
      sx={dialogStyles}
      open
      fullWidth
      maxWidth="md"
      aria-labelledby="receive-title"
      onClose={mutation.isPending ? undefined : onClose}
    >
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogTitle id="receive-title">Receber título</DialogTitle>
        <DialogContent dividers>
          <TitleOverview title={title} />
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {methods.isError && (
              <Alert severity="error">Não foi possível carregar as formas de pagamento.</Alert>
            )}
            <Box
              component="fieldset"
              disabled={mutation.isPending}
              sx={{ ...formGrid, p: 0, m: 0, border: 0, minWidth: 0 }}
            >
              <TextField
                required
                label="Data do recebimento"
                type="date"
                value={form.receivedAt}
                onChange={(e) => change('receivedAt', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <MoneyField
                required
                label="Valor da baixa"
                value={form.amountAppliedCents}
                onChange={(v) => change('amountAppliedCents', v)}
                helperText="Valor do principal que será quitado."
              />
              <TextField
                required
                select
                label="Forma de pagamento"
                value={form.paymentMethodId}
                onChange={(e) => change('paymentMethodId', e.target.value)}
                disabled={methods.isPending}
              >
                <MenuItem value="">Selecione</MenuItem>
                {methods.data?.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
              {[
                ['discountCents', 'Desconto'],
                ['interestCents', 'Juros'],
                ['penaltyCents', 'Multa']
              ].map(([key, label]) => (
                <MoneyField key={key} label={label} value={form[key]} onChange={(v) => change(key, v)} />
              ))}
              <TextField
                label="Observação"
                multiline
                minRows={2}
                value={form.notes}
                onChange={(e) => change('notes', e.target.value)}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
            </Box>
            <Box
              sx={{
                ...secondarySurface,
                bgcolor: 'success.soft',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
              aria-live="polite"
            >
              <Typography variant="body2">Total recebido do cliente</Typography>
              <Typography variant="h2">{formatMoney(total)}</Typography>
              <Typography variant="caption">Baixa − desconto + juros + multa</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || !methods.data}>
            {mutation.isPending ? 'Registrando...' : 'Confirmar recebimento'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
ReceiveDialog.propTypes = {
  title: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};
