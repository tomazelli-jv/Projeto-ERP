import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useEmployee, useSaveEmployee } from '../../hooks/useEmployees.js';
import { employeeError, validateEmployee } from '../../api/employees-contract.js';
import { LoadingState } from '../feedback/LoadingState.jsx';
import { ErrorState } from '../feedback/ErrorState.jsx';

// Dialog é desmontado ao fechar ou mudar contexto/permissão, descartando detalhes e rascunhos.
export function EmployeeDialog({ id, mode, stores, onClose, onSuccess }) {
  const detail = useEmployee(id, id != null);
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={mode === 'detail' ? onClose : undefined}
      aria-labelledby="employee-title"
    >
      <DialogTitle id="employee-title">
        {mode === 'create'
          ? 'Novo funcionário'
          : mode === 'edit'
            ? 'Editar funcionário'
            : 'Detalhes do funcionário'}
      </DialogTitle>
      {id != null && detail.isPending ? (
        <DialogContent>
          <LoadingState message="Carregando funcionário..." />
        </DialogContent>
      ) : id != null && detail.isError ? (
        <DialogContent>
          <ErrorState description={employeeError(detail.error)} onRetry={detail.refetch} />
        </DialogContent>
      ) : mode === 'detail' ? (
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              <strong>Nome:</strong> {detail.data.nome}
            </Typography>
            <Typography>
              <strong>Usuário:</strong> {detail.data.userName}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>
              <strong>E-mail:</strong> {detail.data.email}
            </Typography>
            <Typography>
              <strong>Status:</strong> {detail.data.ativo ? 'Ativo' : 'Inativo'}
            </Typography>
            <Typography>{detail.data.idVinculosLoja.length} vínculos com lojas</Typography>
          </Stack>
        </DialogContent>
      ) : (
        <EmployeeForm
          id={id}
          employee={detail.data}
          stores={stores}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
      {(mode === 'detail' || (id != null && (detail.isPending || detail.isError))) && (
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

function EmployeeForm({ id, employee, stores, onClose, onSuccess }) {
  const creating = id == null;
  const [form, setForm] = useState(() => ({
    nome: employee?.nome ?? '',
    userName: employee?.userName ?? '',
    email: employee?.email ?? '',
    ativo: employee?.ativo ?? true,
    senha: '',
    tipoUsuario: '',
    idLoja: ''
  }));
  const [errors, setErrors] = useState({});
  const mutation = useSaveEmployee(id);
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next = validateEmployee(form, creating, stores);
    setErrors(next);
    if (Object.keys(next).length) return;
    // Retira a senha do estado antes do envio e apaga a referência retida pelo MutationCache ao concluir.
    let pendingForm = { ...form };
    setForm((current) => ({ ...current, senha: '' }));
    try {
      await mutation.mutateAsync(async (save) => {
        try {
          return await save(pendingForm);
        } finally {
          pendingForm = null;
        }
      });
      onSuccess(creating ? 'Funcionário cadastrado com sucesso.' : 'Funcionário atualizado com sucesso.');
    } catch {
      // A mutation apresenta o erro; em nova tentativa de cadastro a senha precisa ser digitada novamente.
    }
  }

  const field = (name, label, props = {}) => (
    <TextField
      fullWidth
      required
      label={label}
      value={form[name]}
      onChange={change(name)}
      error={Boolean(errors[name])}
      helperText={errors[name]}
      disabled={mutation.isPending}
      {...props}
    />
  );
  return (
    <>
      <DialogContent>
        <Stack component="form" id="employee-form" noValidate onSubmit={submit} spacing={2.5} sx={{ pt: 1 }}>
          {mutation.isError && <Alert severity="error">{employeeError(mutation.error)}</Alert>}
          {field('nome', 'Nome', { autoFocus: true })}
          {field('userName', 'Usuário', { autoComplete: 'off' })}
          {field('email', 'E-mail', { type: 'email' })}
          {creating ? (
            <>
              {field('senha', 'Senha', { type: 'password', autoComplete: 'new-password' })}
              {field('tipoUsuario', 'Tipo de usuário', {
                select: true,
                children: [
                  <MenuItem key="1" value={1}>
                    Administrador
                  </MenuItem>,
                  <MenuItem key="2" value={2}>
                    Administrador de loja
                  </MenuItem>,
                  <MenuItem key="3" value={3}>
                    Vendedor
                  </MenuItem>
                ]
              })}
              <Typography variant="body2" color="text.secondary">
                O tipo define as permissões iniciais; não concede automaticamente uma role administrativa.
              </Typography>
              {field('idLoja', 'Loja inicial', {
                select: true,
                children: stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.nome || 'Nome não informado'}
                  </MenuItem>
                ))
              })}
            </>
          ) : (
            <FormControlLabel
              label={form.ativo ? 'Usuário ativo' : 'Usuário inativo'}
              control={
                <Switch
                  checked={form.ativo}
                  disabled={mutation.isPending}
                  onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                />
              }
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={mutation.isPending} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="contained" type="submit" form="employee-form" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : creating ? 'Cadastrar' : 'Salvar alterações'}
        </Button>
      </DialogActions>
    </>
  );
}

const dialogProps = {
  id: PropTypes.number,
  stores: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};
EmployeeDialog.propTypes = { ...dialogProps, mode: PropTypes.oneOf(['create', 'edit', 'detail']).isRequired };
EmployeeForm.propTypes = { ...dialogProps, employee: PropTypes.object };
