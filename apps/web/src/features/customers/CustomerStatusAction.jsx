import { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Snackbar } from '@mui/material';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useCustomerMutation } from './customer-queries.js';

// A mudança de status é reversível e exige a mesma confirmação usada no restante do ERP.
export function CustomerStatusAction({ customer, onClose }) {
  const mutation = useCustomerMutation();
  const [active] = useState(customer.status !== 'ACTIVE');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <>
      <ConfirmDialog
        open={!confirmed}
        title={active ? 'Ativar cliente?' : 'Inativar cliente?'}
        description={
          mutation.error?.message ??
          (active
            ? 'O cliente voltará a ficar disponível para novas operações.'
            : 'O cliente permanecerá no histórico, mas não ficará disponível para novas operações.')
        }
        confirmLabel={active ? 'Ativar' : 'Inativar'}
        loading={mutation.isPending}
        onClose={onClose}
        onConfirm={() => {
          if (!mutation.isPending)
            mutation.mutate(
              { operation: 'setActive', id: customer.id, active },
              { onSuccess: () => setConfirmed(true) }
            );
        }}
      />
      <Snackbar open={confirmed} autoHideDuration={5000} onClose={onClose}>
        <Alert
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={onClose}>
              Fechar
            </Button>
          }
        >
          Cliente {active ? 'ativado' : 'inativado'} com sucesso.
        </Alert>
      </Snackbar>
    </>
  );
}
CustomerStatusAction.propTypes = {
  customer: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired
};
