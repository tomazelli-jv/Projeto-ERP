import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { addressLines, documentLabel, documentValue } from './business-model.js';

// Cards horizontais usam o espaço disponível e empilham endereço/ações em telas estreitas.
export function LojaCard({ loja, onView, onStatus, disabled }) {
  return (
    <Card>
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'minmax(0,1.2fr) minmax(0,1fr) auto' },
          gap: 2,
          alignItems: 'center',
          p: 2
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            variant="rounded"
            sx={{ width: 48, height: 48, bgcolor: 'primary.soft', color: 'primary.dark' }}
          >
            <StorefrontOutlinedIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="h3" sx={{ overflowWrap: 'anywhere' }}>
                {loja.nome}
              </Typography>
              <Chip
                size="small"
                label={loja.ativo ? 'Ativa' : 'Inativa'}
                color={loja.ativo ? 'success' : 'error'}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {documentLabel(loja)}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>{documentValue(loja)}</Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, pl: { md: 2 }, minWidth: 0 }}
        >
          <LocationOnOutlinedIcon />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Endereço
            </Typography>
            {(addressLines(loja).length ? addressLines(loja) : ['Não informado']).map((line, i) => (
              <Typography key={i} sx={{ overflowWrap: 'anywhere' }}>
                {line}
              </Typography>
            ))}
          </Box>
        </Stack>
        <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
          <Tooltip title="Visualizar loja">
            <IconButton
              aria-label="Visualizar dados da loja"
              onClick={() => onView(loja)}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}
            >
              <VisibilityOutlinedIcon />
            </IconButton>
          </Tooltip>
          {onStatus && (
            <Button
              disabled={disabled}
              variant="outlined"
              color={loja.ativo ? 'error' : 'success'}
              startIcon={loja.ativo ? <BlockOutlinedIcon /> : <CheckCircleOutlineIcon />}
              onClick={() => onStatus(loja)}
            >
              {loja.ativo ? 'Inativar' : 'Ativar'}
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
LojaCard.propTypes = {
  loja: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired,
  onStatus: PropTypes.func,
  disabled: PropTypes.bool
};
