import { useState } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import { Avatar, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { EntityStatus } from '../parties/EntityShared.jsx';
import { EntityStatusAction } from '../parties/EntityStatusAction.jsx';
import { formatMoney } from '../../components/business/money.js';
import { formatDate } from '../../components/business/business-formatters.js';
import { itemTypeLabel } from './product-options.js';
import { fiscalSections } from './product-fields.js';

// Consulta somente os campos do catálogo atual. Campos futuros não simulam saldo nem tributação.
const cardSx = {
  p: 2.5,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '14px',
  minWidth: 0
};
function DetailCard({ title, children }) {
  return (
    <Box component="section" aria-label={title} sx={cardSx}>
      <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
DetailCard.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node };

// Description lists mantêm a relação entre rótulos e valores também para leitores de tela.
function Fields({ items, narrow = false }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
        ...(!narrow && { '@media (min-width:860px)': { gridTemplateColumns: 'repeat(3,minmax(0,1fr))' } })
      }}
    >
      {items.map(([label, value, full]) => (
        <Box key={label} sx={{ minWidth: 0, ...(full && { gridColumn: '1 / -1' }) }}>
          <Typography component="dt" sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
            {label}
          </Typography>
          <Typography
            component="dd"
            sx={{
              m: 0,
              fontSize: 14,
              fontWeight: 550,
              overflowWrap: 'anywhere',
              color: value === undefined || value === null || value === '' ? 'text.secondary' : 'text.primary'
            }}
          >
            {value === undefined || value === null || value === '' ? '—' : value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
Fields.propTypes = { items: PropTypes.array.isRequired, narrow: PropTypes.bool };
const pendingFields = (labels) => labels.map((label) => [label, null]);
const columnsSx = {
  display: 'grid',
  gap: '20px',
  gridTemplateColumns: 'minmax(0,1fr)',
  '@media (min-width:860px)': { gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)' }
};

export function ProductProfile({ item }) {
  const [tab, setTab] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const product = item.type === 'PRODUCT';
  const stock = product && item.trackStock;
  const Icon = product ? Inventory2OutlinedIcon : HandymanOutlinedIcon;
  return (
    <Stack spacing={2.5}>
      <Box sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Avatar
          variant="rounded"
          sx={{ width: 56, height: 56, bgcolor: 'primary.soft', color: 'primary.main' }}
        >
          <Icon />
        </Avatar>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 20, fontWeight: 650, overflowWrap: 'anywhere' }}>
            {item.name}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mt: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              {itemTypeLabel(item.type)} · {item.code}
            </Typography>
            <EntityStatus status={item.status} />
          </Stack>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            '@media (max-width:859px)': { width: '100%', '& > *': { flex: 1 } },
            '@media (max-width:420px)': { flexDirection: 'column' }
          }}
        >
          <Button component={Link} to={`/products/${item.id}/edit`} variant="contained">
            Editar item
          </Button>
          <Button variant="outlined" onClick={() => setStatusOpen(true)}>
            {item.status === 'ACTIVE' ? 'Inativar item' : 'Ativar item'}
          </Button>
        </Box>
      </Box>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        aria-label="Dados do item"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', bgcolor: 'transparent', borderRadius: 0 },
          '& .MuiTabs-indicator': { height: 2 }
        }}
      >
        {['Informações', 'Tributação'].map((label, index) => (
          <Tab key={label} label={label} id={`item-tab-${index}`} aria-controls={`item-panel-${index}`} />
        ))}
      </Tabs>
      {[0, 1].map((index) => (
        <Box
          key={index}
          role="tabpanel"
          id={`item-panel-${index}`}
          aria-labelledby={`item-tab-${index}`}
          hidden={tab !== index}
          tabIndex={0}
        >
          {tab === index && (
            <Box
              sx={{
                ...columnsSx,
                animation: 'itemReveal 180ms ease-out',
                '@keyframes itemReveal': {
                  from: { opacity: 0, transform: 'translateY(5px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
              }}
            >
              {index === 0 ? (
                <>
                  <Stack spacing={2.5}>
                    <DetailCard title="Dados gerais">
                      <Fields
                        items={[
                          ['Nome', item.name],
                          ['Código interno', item.code],
                          ['Unidade de medida', item.unit],
                          ['Grupo', item.category],
                          ['Marca', item.brand],
                          ['GTIN / código de barras', item.gtin],
                          ['Descrição', item.description, true],
                          ...(!product
                            ? [
                                ['Duração estimada (minutos)', item.durationMinutes],
                                ['Descrição do serviço', item.serviceDescription, true]
                              ]
                            : [])
                        ]}
                      />
                    </DetailCard>
                    <DetailCard title="Estoque">
                      <Fields
                        items={[
                          ['Controla estoque?', stock ? 'Sim' : 'Não'],
                          ...(stock
                            ? [
                                ['Estoque mínimo', item.minimumStock],
                                ['Estoque máximo', item.maximumStock],
                                ['Localização', item.stockLocation],
                                [
                                  'Permite estoque negativo?',
                                  item.allowNegativeStock == null
                                    ? null
                                    : item.allowNegativeStock
                                      ? 'Sim'
                                      : 'Não'
                                ],
                                ['Saldo inicial registrado', item.initialStock],
                                ['Loja vinculada', item.stockStoreId ? `Loja ${item.stockStoreId}` : null],
                                ...pendingFields([
                                  'Saldo atual',
                                  'Status do estoque',
                                  'Observação de estoque'
                                ])
                              ]
                            : [])
                        ]}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {stock
                          ? 'Saldos e movimentações por loja aguardam integração.'
                          : 'Este item não controla estoque.'}
                      </Typography>
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'surface.secondary', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Operações de estoque — aguardando integração
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                          {['Entrada', 'Saída', 'Ajustar estoque', 'Transferir'].map((label) => (
                            <Button key={label} disabled variant="outlined" size="small">
                              {label}
                            </Button>
                          ))}
                        </Stack>
                      </Box>
                      {stock && (
                        <Box sx={{ mt: 2 }}>
                          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            Última movimentação
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Movimentações ainda não disponíveis. Data, tipo, quantidade e observação serão
                            exibidos após a integração.
                          </Typography>
                        </Box>
                      )}
                    </DetailCard>
                  </Stack>
                  <Stack spacing={2.5}>
                    <DetailCard title="Preço">
                      <Typography variant="caption" color="text.secondary">
                        Preço de venda
                      </Typography>
                      <Typography sx={{ fontSize: 30, fontWeight: 650, mb: 2, overflowWrap: 'anywhere' }}>
                        {formatMoney(item.priceCents)}
                      </Typography>
                      <Fields
                        narrow
                        items={[
                          ['Preço de custo', item.costCents != null ? formatMoney(item.costCents) : null],
                          ['Margem', item.margin ? item.margin + ' %' : null],
                          [
                            'Preço promocional',
                            item.promotionPriceCents != null ? formatMoney(item.promotionPriceCents) : null
                          ],
                          [
                            'Início da promoção',
                            item.promotionStart ? formatDate(`${item.promotionStart}T12:00:00`) : null
                          ],
                          [
                            'Fim da promoção',
                            item.promotionEnd ? formatDate(`${item.promotionEnd}T12:00:00`) : null
                          ]
                        ]}
                      />
                    </DetailCard>
                    <DetailCard title="Registro">
                      <Fields
                        narrow
                        items={[
                          ['Cadastrado em', item.createdAt ? formatDate(item.createdAt) : null],
                          ['Última atualização', item.updatedAt ? formatDate(item.updatedAt) : null],
                          ...pendingFields(['Cadastrado por', 'Atualizado por'])
                        ]}
                      />
                    </DetailCard>
                  </Stack>
                </>
              ) : (
                <>
                  <Stack spacing={2.5}>
                    <Typography variant="body2" color="text.secondary">
                      Configuração local, sem aplicação automática de tributos. Campos sem dados aparecem como
                      “—”.
                    </Typography>
                    {[0, 1, 4].map((section) => (
                      <DetailCard key={section} title={fiscalSections[section][0]}>
                        <Fields
                          items={[
                            ...(section === 0
                              ? [
                                  ['NCM', item.ncm],
                                  ['Referência do fabricante', item.manufacturerReference]
                                ]
                              : []),
                            ...fiscalSections[section][1].map(([key, label, kind]) => [
                              label,
                              item[key] ? `${item[key]}${kind === '%' ? ' %' : ''}` : null,
                              key === 'reformNotes'
                            ])
                          ]}
                        />
                      </DetailCard>
                    ))}
                  </Stack>
                  <Stack spacing={2.5}>
                    {[2, 3].map((section) => (
                      <DetailCard key={section} title={fiscalSections[section][0]}>
                        <Fields
                          narrow
                          items={fiscalSections[section][1].map(([key, label, kind]) => [
                            label,
                            item[key] ? `${item[key]}${kind === '%' ? ' %' : ''}` : null
                          ])}
                        />
                      </DetailCard>
                    ))}{' '}
                    <DetailCard title="Parâmetros complementares">
                      <Fields
                        narrow
                        items={[
                          ['Enquadramento fiscal', null],
                          ['Tipo do item', itemTypeLabel(item.type)],
                          ...pendingFields(['Finalidade do item', 'Gera crédito']),
                          ['Observações fiscais', null, true]
                        ]}
                      />
                    </DetailCard>
                  </Stack>
                </>
              )}
            </Box>
          )}
        </Box>
      ))}
      {statusOpen && <EntityStatusAction customer={item} onClose={() => setStatusOpen(false)} />}
    </Stack>
  );
}
ProductProfile.propTypes = { item: PropTypes.object.isRequired };
