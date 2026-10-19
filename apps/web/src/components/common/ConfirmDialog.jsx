import { CancelButton } from './CancelButton';
// sx opcional aplica o refinamento visual no portal, preservando os demais dialogs.
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import PropTypes from 'prop-types';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onClose,
  sx
}) {
  return (
    <Dialog
      sx={sx}
      aria-labelledby="confirm-dialog-title"
      fullWidth
      maxWidth="xs"
      onClose={loading ? undefined : onClose}
      open={open}
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <CancelButton active={cancelLabel === 'Cancelar'} disabled={loading} onClick={onClose}>
          {cancelLabel}
        </CancelButton>
        <Button color="error" disabled={loading} onClick={onConfirm} variant="contained">
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  cancelLabel: PropTypes.string,
  loading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  onClose: PropTypes.func.isRequired
};
