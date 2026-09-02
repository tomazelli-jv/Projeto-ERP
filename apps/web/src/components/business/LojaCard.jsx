import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { StatusChip } from '../common/StatusChip.jsx';
import { formatCnpj, formatPhone } from './business-formatters.js';

// Card responsivo apresenta informações operacionais sem expor UUIDs ou recorrer a uma tabela pesada.
export function LojaCard({ loja, onEdit }) {
  const location = [loja.cidade, loja.uf].filter(Boolean).join(' / ') || 'Localização não informada';
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" gap={2}>
          <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
            <Box sx={{ color: 'primary.main', pt: 0.25 }}>
              <StorefrontOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                {loja.nomeFantasia}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {loja.razaoSocial}
              </Typography>
            </Box>
          </Stack>
          <StatusChip label={loja.ativo ? 'Ativa' : 'Inativa'} status={loja.ativo ? 'active' : 'inactive'} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={0.75} sx={{ flexGrow: 1 }}>
          <Typography variant="body2">
            <strong>CNPJ:</strong> {formatCnpj(loja.documento)}
          </Typography>
          <Typography variant="body2">
            <strong>Localização:</strong> {location}
          </Typography>
          {loja.telefone && (
            <Typography variant="body2">
              <strong>Telefone:</strong> {formatPhone(loja.telefone)}
            </Typography>
          )}
          {loja.email && (
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              <strong>E-mail:</strong> {loja.email}
            </Typography>
          )}
        </Stack>
        <Button onClick={() => onEdit(loja)} sx={{ alignSelf: 'flex-end', mt: 2 }} variant="outlined">
          Editar
        </Button>
      </CardContent>
    </Card>
  );
}

LojaCard.propTypes = { loja: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired };
