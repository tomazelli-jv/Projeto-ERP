import { useState } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import { Alert, Box, Button, Stack, useMediaQuery } from '@mui/material';
import PersonOutline from '@mui/icons-material/PersonOutline';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { EntitySummary, EntityInfo } from '../parties/EntityShared.jsx';
import { EntityStatusAction } from '../parties/EntityStatusAction.jsx';
import { customerName, customerDocument, typeLabel } from '../customers/customer-model.js';
import { taxpayerTypes } from '../customers/customer-schema.js';
import { useEntityModule } from './entity-module.js';
import { SupplierFinancialSummary } from '../suppliers/SupplierFinancialSummary.jsx';
import { formatPhone, formatCep, formatDate } from '../../components/business/business-formatters.js';
import { formatMoney } from '../../components/business/money.js';

const customerSections = [
  ['Dados Gerais', PersonOutline],
  ['Financeiro', AccountBalanceWalletOutlined],
  ['Histórico (Logs)', HistoryOutlined],
  ['Fiscal', DescriptionOutlined]
];
// Navegação local preserva o registro e a consulta; painéis exibem apenas dados persistidos.
export function EntityDetail({ customer }) {
  const module = useEntityModule();
  const supplier = module.key === 'suppliers';
  const c = module.empty(customer);
  const sections = supplier
    ? [customerSections[0], customerSections[1], ['Histórico', HistoryOutlined]]
    : customerSections;
  const [section, setSection] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const fiscal = [
    ['Tipo de Contribuinte', taxpayerTypes[c.taxpayerType]],
    ['Tipo de inscrição', c.registrationType],
    ['Inscrição Estadual', c.stateRegistration],
    ['Inscrição Municipal', c.municipalRegistration]
  ];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(260px,1fr) minmax(0,2.5fr)' },
        gap: 3,
        alignItems: 'start'
      }}
    >
      <Stack spacing={2}>
        <EntitySummary customer={c} />
        <Button component={Link} to={`${module.path}/${c.id}/edit`} variant="contained">
          {`Editar ${module.singular}`}
        </Button>
        <Button
          variant="outlined"
          color={c.status === 'ACTIVE' ? 'error' : 'success'}
          onClick={() => setStatusOpen(true)}
        >
          {c.status === 'ACTIVE' ? `Inativar ${module.singular}` : `Ativar ${module.singular}`}
        </Button>
      </Stack>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <Box
          role="group"
          aria-label={`Seções do ${module.singular}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2,minmax(0,1fr))',
              md: `repeat(${sections.length},minmax(0,1fr))`
            },
            gap: 1.5
          }}
        >
          {sections.map(([label, Icon], index) => (
            <Button
              key={label}
              aria-pressed={section === index}
              aria-controls="customer-detail-panel"
              onClick={() => setSection(index)}
              variant="outlined"
              sx={{
                minHeight: 112,
                flexDirection: 'column',
                gap: 1.5,
                color: section === index ? 'primary.main' : 'text.secondary',
                borderColor: section === index ? 'primary.main' : 'divider',
                bgcolor: section === index ? 'action.selected' : 'background.paper',
                textAlign: 'center'
              }}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </Box>
        <Box
          key={section}
          id="customer-detail-panel"
          role="region"
          aria-label={sections[section][0]}
          sx={{
            animation: reduced ? 'none' : 'customerReveal 160ms ease-out',
            '@keyframes customerReveal': { from: { opacity: 0 }, to: { opacity: 1 } }
          }}
        >
          <SectionCard title={sections[section][0]}>
            {section === 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' },
                  gap: 3
                }}
              >
                <EntityInfo
                  items={[
                    ['Tipo', typeLabel(c.type)],
                    ['Nome', customerName(c)],
                    ['Razão Social', c.legalName],
                    ['CPF/CNPJ', customerDocument(c)],
                    ...(c.type === 'PERSON'
                      ? [
                          ['RG', c.rg],
                          ...(!supplier ? [['Data de nascimento', formatDate(c.birthDate)]] : [])
                        ]
                      : [
                          ...(!supplier ? [['Data de inscrição', formatDate(c.registrationDate)]] : []),
                          ['Nome do contato', c.contactName]
                        ]),
                    ...(supplier
                      ? [
                          ['Tipo do fornecedor', c.supplierType],
                          ['Tipo de inscrição', c.registrationType],
                          ['Pessoa de contato', c.commercialContact],
                          ['Data de inscrição', formatDate(c.registrationDate)],
                          ['Inscrição Estadual', c.stateRegistration],
                          ['Inscrição Municipal', c.municipalRegistration],
                          ['E-mail comercial', c.commercialEmail],
                          ['Telefone comercial', formatPhone(c.commercialPhone)],
                          ['Observações comerciais', c.commercialNotes]
                        ]
                      : fiscal.slice(1)),
                    ['Status', c.status === 'ACTIVE' ? 'Ativo' : 'Inativo'],
                    ['Observações', c.notes]
                  ]}
                />
                <EntityInfo
                  items={[
                    ['Celular', formatPhone(c.mobile)],
                    ['Telefone', formatPhone(c.phone)],
                    ['E-mail', c.email],
                    ['CEP', formatCep(c.address.cep)],
                    ['Endereço', c.address.street],
                    ['Número', c.address.number],
                    ['Complemento', c.address.complement],
                    ['Bairro', c.address.neighborhood],
                    ['Cidade', c.address.city],
                    ['UF', c.address.state],
                    ['Cadastro local', formatDate(c.createdAt)],
                    ['Atualização local', formatDate(c.updatedAt)]
                  ]}
                />
              </Box>
            )}
            {!supplier && section === 1 && (
              <Stack spacing={3}>
                <EntityInfo
                  items={[
                    ['Permite contas a receber', c.financial.allowReceivables ? 'Sim' : 'Não'],
                    ['Limite de crédito', formatMoney(c.financial.creditLimit)]
                  ]}
                />
                <Alert severity="info">
                  Movimentações financeiras estarão disponíveis após a integração do módulo financeiro.
                </Alert>
              </Stack>
            )}
            {supplier && section === 1 && <SupplierFinancialSummary financial={c.financial} />}
            {section === 2 && <Alert severity="info">Nenhum histórico disponível.</Alert>}
            {section === 3 && <EntityInfo items={fiscal} />}
          </SectionCard>
        </Box>
      </Stack>
      {statusOpen && <EntityStatusAction customer={c} onClose={() => setStatusOpen(false)} />}
    </Box>
  );
}
EntityDetail.propTypes = { customer: PropTypes.object.isRequired };
