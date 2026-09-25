import { useState } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import EditIcon from '@mui/icons-material/Edit';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { EntityInfo, EntityStatus } from '../parties/EntityShared.jsx';
import { EntityStatusAction } from '../parties/EntityStatusAction.jsx';
import { businessCardSx } from '../../components/business/business-styles.js';
import { formatMoney } from '../../components/business/money.js';
import { formatDate } from '../../components/business/business-formatters.js';
import { itemTypeLabel } from './product-options.js';

// Resumo e perfil usam os mesmos campos e componentes de informação dos cadastros PF/PJ.
export function ProductSummary({ item }) {
  const Icon = item.type === 'PRODUCT' ? Inventory2OutlinedIcon : HandymanOutlinedIcon;
  return (
    <SectionCard title="Resumo do item">
      <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'surface.secondary', color: 'text.secondary' }}>
          <Icon />
        </Avatar>
        <Typography variant="h3" sx={{ overflowWrap: 'anywhere', maxWidth: '100%' }}>
          {item.name || 'Novo item'}
        </Typography>
        <EntityStatus status={item.status} />
      </Stack>
      <EntityInfo
        items={[
          ['Tipo', itemTypeLabel(item.type)],
          ['Código', item.code],
          ['Categoria', item.category],
          ['Preço', formatMoney(item.priceCents)],
          ['Unidade', item.unit],
          ...(item.type === 'PRODUCT' ? [['Controle de estoque', item.trackStock ? 'Sim' : 'Não']] : [])
        ]}
      />
    </SectionCard>
  );
}
ProductSummary.propTypes = { item: PropTypes.object.isRequired };
export function ProductProfile({ item }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const product = item.type === 'PRODUCT';
  const Icon = product ? Inventory2OutlinedIcon : HandymanOutlinedIcon;
  return (
    <Stack spacing={3}>
      <SectionCard sx={businessCardSx}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={2}>
          <Avatar
            variant="rounded"
            sx={{ width: 72, height: 72, bgcolor: 'primary.soft', color: 'primary.dark' }}
          >
            <Icon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h2" sx={{ overflowWrap: 'anywhere' }}>
              {item.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
              {itemTypeLabel(item.type)} · {item.code}
            </Typography>
            <EntityStatus status={item.status} />
          </Box>
          <Button
            component={Link}
            to={`/products/${item.id}/edit`}
            startIcon={<EditIcon />}
            variant="contained"
          >
            Editar {product ? 'produto' : 'serviço'}
          </Button>
          <Button variant="outlined" onClick={() => setStatusOpen(true)}>
            {item.status === 'ACTIVE' ? 'Inativar item' : 'Ativar item'}
          </Button>
        </Stack>
      </SectionCard>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1.7fr) minmax(300px,1fr)' },
          gap: 3
        }}
      >
        <Stack spacing={3}>
          <SectionCard title="Dados principais" sx={businessCardSx}>
            <EntityInfo
              items={[
                ['Nome', item.name],
                ['Código interno', item.code],
                ['Categoria', item.category],
                ['Unidade', item.unit],
                ['Descrição', item.description]
              ]}
            />
          </SectionCard>
          {product ? (
            <>
              <SectionCard title="Identificação" sx={businessCardSx}>
                <EntityInfo
                  items={[
                    ['Código de barras / GTIN', item.gtin],
                    ['NCM', item.ncm],
                    ['Marca', item.brand],
                    ['Referência do fabricante', item.manufacturerReference]
                  ]}
                />
              </SectionCard>
              <SectionCard title="Configuração de estoque" sx={businessCardSx}>
                <EntityInfo
                  items={[
                    ['Controla estoque', item.trackStock ? 'Sim' : 'Não'],
                    ...(item.trackStock ? [['Estoque mínimo', item.minimumStock]] : [])
                  ]}
                />
              </SectionCard>
            </>
          ) : (
            <SectionCard title="Dados do serviço" sx={businessCardSx}>
              <EntityInfo
                items={[
                  ['Unidade de cobrança', item.unit],
                  ['Duração estimada (minutos)', item.durationMinutes],
                  ['Descrição do serviço', item.serviceDescription]
                ]}
              />
            </SectionCard>
          )}
        </Stack>
        <Stack spacing={3}>
          <SectionCard title="Valores" sx={businessCardSx}>
            <EntityInfo
              items={[
                ['Preço de venda', formatMoney(item.priceCents)],
                ...(product && item.costCents !== null
                  ? [['Preço de custo', formatMoney(item.costCents)]]
                  : [])
              ]}
            />
          </SectionCard>
          <SectionCard title="Registro de demonstração" sx={businessCardSx}>
            <EntityInfo
              items={[
                ['Data de cadastro', formatDate(item.createdAt)],
                ['Última atualização', formatDate(item.updatedAt)]
              ]}
            />
          </SectionCard>
        </Stack>
      </Box>
      {statusOpen && <EntityStatusAction customer={item} onClose={() => setStatusOpen(false)} />}
    </Stack>
  );
}
ProductProfile.propTypes = { item: PropTypes.object.isRequired };
