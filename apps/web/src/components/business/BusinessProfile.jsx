import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import { Avatar, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { SectionCard } from '../common/SectionCard.jsx';
import { formatDate, formatPhone } from './business-formatters.js';
import { addressLines, documentLabel, documentValue } from './business-model.js';
import { businessDensitySx, businessCardSx } from './business-styles.js';

// A listagem de Loja já retorna o DTO completo. Não depende da policy ausente de GET Loja/{id}.
export function BusinessProfile({ record, kind, companyName, onClose, onEdit }) {
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
    <Box sx={businessDensitySx} component="section" aria-labelledby="business-detail-title">
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography component="h2" variant="h2" id="business-detail-title">
            {store ? 'Perfil da loja' : 'Perfil da empresa'}
          </Typography>
          <Typography component="p" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {store
              ? 'Identificação, contato e endereço da unidade.'
              : 'Identificação e situação cadastral da empresa.'}
          </Typography>
        </Box>
        <Button startIcon={<ArrowBackOutlinedIcon />} variant="outlined" onClick={onClose}>
          Voltar para a lista
        </Button>
      </Stack>
      <Box>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Cabeçalho de perfil segue Usuários; exibe somente informações do registro selecionado. */}
          <SectionCard sx={{ ...businessCardSx, position: 'relative', overflow: 'hidden' }}>
            <Icon
              aria-hidden="true"
              sx={{
                position: 'absolute',
                right: -20,
                top: 0,
                fontSize: 180,
                opacity: 0.035,
                pointerEvents: 'none'
              }}
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  bgcolor: 'primary.soft',
                  color: 'primary.dark'
                }}
              >
                <Icon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
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
              {onEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={onEdit}
                  sx={{ flexShrink: 0 }}
                >
                  Editar {store ? 'loja' : 'empresa'}
                </Button>
              )}
            </Stack>
            {store && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  gap={1.5}
                  useFlexGap
                  sx={{ flexWrap: 'wrap', position: 'relative' }}
                >
                  {[
                    [ContactMailOutlinedIcon, record.email || 'E-mail não informado'],
                    [PhoneOutlinedIcon, formatPhone(record.telefone) || 'Telefone não informado']
                  ].map(([ContactIcon, value], index) => (
                    <Stack
                      key={index}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        minWidth: 0,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1
                      }}
                    >
                      <ContactIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </SectionCard>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0,1fr)',
                md: 'minmax(0,1.4fr) minmax(0,1fr)'
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
            {!store && (
              <SectionCard sx={businessCardSx} title="Situação cadastral" icon={BusinessOutlinedIcon}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      size="small"
                      label={record.ativo ? 'Ativa' : 'Inativa'}
                      color={record.ativo ? 'success' : 'error'}
                    />
                  </Stack>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Consulte as unidades vinculadas na lista de lojas desta empresa.
                  </Typography>
                </Stack>
              </SectionCard>
            )}
            {store && (
              <Stack spacing={2}>
                <SectionCard sx={businessCardSx} title="Endereço" icon={LocationOnOutlinedIcon}>
                  {(addressLines(record).length ? addressLines(record) : ['Não informado']).map((line, i) => (
                    <Typography key={i} sx={{ overflowWrap: 'anywhere' }}>
                      {line}
                    </Typography>
                  ))}
                </SectionCard>
                <SectionCard sx={businessCardSx} title="Empresa vinculada" icon={BusinessOutlinedIcon}>
                  <Typography sx={{ overflowWrap: 'anywhere' }}>{companyName || 'Não informada'}</Typography>
                </SectionCard>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
BusinessProfile.propTypes = {
  record: PropTypes.object.isRequired,
  kind: PropTypes.string.isRequired,
  companyName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func
};
