import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import { SectionCard } from '../common/SectionCard.jsx';
import { formatDate, formatPhone } from './business-formatters.js';
import { addressLines, documentLabel, documentValue } from './business-model.js';
import { businessDensitySx, businessCardSx } from './business-styles.js';

// A listagem de Loja já retorna o DTO completo. Não depende da policy ausente de GET Loja/{id}.
export function BusinessDetailDialog({ record, kind, companyName, onClose, onEdit }) {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const store = kind === 'loja';
  const Icon = store ? StorefrontOutlinedIcon : BusinessOutlinedIcon;
  const rows = store
    ? [
        ['Nome', record.nome],
        ['Razão social', record.razaoSocial],
        ['Tipo de pessoa', record.tipoPessoa === 1 ? 'Física' : 'Jurídica'],
        [documentLabel(record), documentValue(record)],
        ['Cadastrada em', formatDate(record.dataCadastro)]
      ]
    : [
        ['Nome', record.nome],
        ['Cadastrada em', formatDate(record.dataCadastro)]
      ];
  return (
    <Dialog
      sx={businessDensitySx}
      open
      fullWidth
      fullScreen={fullScreen}
      maxWidth="lg"
      onClose={onClose}
      aria-labelledby="business-detail-title"
    >
      <DialogTitle id="business-detail-title">{store ? 'Perfil da loja' : 'Perfil da empresa'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <SectionCard sx={{ ...businessCardSx, bgcolor: 'surface.secondary' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Avatar
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: 'surface.secondary', color: 'text.secondary' }}
              >
                <Icon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h2" sx={{ overflowWrap: 'anywhere', mb: 1 }}>
                  {record.nome}
                </Typography>
                <Chip
                  size="small"
                  label={record.ativo ? 'Ativa' : 'Inativa'}
                  color={record.ativo ? 'success' : 'error'}
                />
                {store && (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {companyName}
                  </Typography>
                )}
              </Box>
            </Stack>
          </SectionCard>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0,1fr)',
                md: store ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)'
              },
              gap: 2
            }}
          >
            <SectionCard sx={businessCardSx} title={store ? 'Dados da loja' : 'Dados da empresa'} icon={Icon}>
              <Stack spacing={2}>
                {rows.map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{value || 'Não informado'}</Typography>
                  </Box>
                ))}
              </Stack>
            </SectionCard>
            {store && (
              <Stack spacing={2}>
                <SectionCard sx={businessCardSx} title="Endereço" icon={LocationOnOutlinedIcon}>
                  {(addressLines(record).length ? addressLines(record) : ['Não informado']).map((line, i) => (
                    <Typography key={i} sx={{ overflowWrap: 'anywhere' }}>
                      {line}
                    </Typography>
                  ))}
                </SectionCard>
                <SectionCard sx={businessCardSx} title="Contato" icon={ContactMailOutlinedIcon}>
                  <Typography sx={{ overflowWrap: 'anywhere' }}>
                    {record.email || 'E-mail não informado'}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography>{formatPhone(record.telefone) || 'Telefone não informado'}</Typography>
                </SectionCard>
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Fechar
        </Button>
        {onEdit && (
          <Button variant="contained" onClick={onEdit}>
            Editar {store ? 'loja' : 'empresa'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
BusinessDetailDialog.propTypes = {
  record: PropTypes.object.isRequired,
  kind: PropTypes.string.isRequired,
  companyName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func
};
