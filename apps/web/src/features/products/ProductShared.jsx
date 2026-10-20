import PropTypes from 'prop-types';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { EntityStatus } from '../parties/EntityShared.jsx';
import { formatMoney } from '../../components/business/money.js';
import { itemTypeLabel } from './product-options.js';

// Resumo do formulário acompanha os valores em edição sem persistência antecipada.
export function ProductSummary({ item }) {
  const Icon = item.type === 'PRODUCT' ? Inventory2OutlinedIcon : HandymanOutlinedIcon;
  return (
    <SectionCard title="Resumo do produto" sx={{ borderRadius: '14px', boxShadow: 'none' }}>
      <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'surface.secondary', color: 'text.secondary' }}>
          <Icon />
        </Avatar>
        <Typography variant="h3" sx={{ overflowWrap: 'anywhere', maxWidth: '100%' }}>
          {item.name || 'Novo produto'}
        </Typography>
        <EntityStatus status={item.status} />
      </Stack>
      {/* Linhas compactas mantêm preço e unidade visíveis no resumo sticky de notebooks. */}
      <Box component="dl" sx={{ m: 0 }}>
        {[
          ['Tipo', itemTypeLabel(item.type)],
          ['Código', item.code],
          ['Grupo', item.category],
          ['Marca', item.type === 'PRODUCT' ? item.brand : null],
          ['NCM', item.type === 'PRODUCT' ? item.ncm : null],
          ['Preço de venda', item.priceCents != null ? formatMoney(item.priceCents) : null],
          ['Unidade', item.unit],
          ...(item.type === 'PRODUCT' ? [['Controle de estoque', item.trackStock ? 'Sim' : 'Não']] : [])
        ].map(([label, value]) => (
          <Box
            key={label}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: 1,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{
                m: 0,
                textAlign: 'right',
                overflowWrap: 'anywhere',
                color: value ? 'text.primary' : 'text.secondary'
              }}
            >
              {value || '—'}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}
ProductSummary.propTypes = { item: PropTypes.object.isRequired };
