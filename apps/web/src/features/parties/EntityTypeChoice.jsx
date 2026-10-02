import { useEntityModule } from './entity-module.js';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import PersonOutline from '@mui/icons-material/PersonOutline';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import { CreateButton } from '../../components/common/CreateButton.jsx';

// A escolha antecede a navegação; ambos os tipos seguem o mesmo editor e repository.
export function EntityTypeChoice() {
  const module = useEntityModule();
  const [open, setOpen] = useState(false);
  return (
    <>
      <CreateButton onClick={() => setOpen(true)} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        {`Novo ${module.singular}`}
      </CreateButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="customer-type-title"
      >
        <DialogTitle id="customer-type-title">{`Tipo de ${module.singular}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Button
              component={Link}
              to={`${module.path}/new?type=PERSON`}
              variant="outlined"
              startIcon={<PersonOutline />}
            >
              Pessoa Física
            </Button>
            <Button
              component={Link}
              to={`${module.path}/new?type=COMPANY`}
              variant="outlined"
              startIcon={<BusinessOutlined />}
            >
              Pessoa Jurídica
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
