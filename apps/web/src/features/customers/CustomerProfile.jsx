import { useState } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { businessCardSx } from '../../components/business/business-styles.js';
import { formatDate, formatPhone, formatCep } from '../../components/business/business-formatters.js';
import { customerName, customerDocument, initials, typeLabel } from './customer-model.js';
import { CustomerInfo, CustomerStatus } from './CustomerShared.jsx';
import { CustomerStatusAction } from './CustomerStatusAction.jsx';

// Perfil segue os cards de Usuários; mostra apenas os dados do repository de demonstração.
export function CustomerProfile({ customer }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const a = customer.address;
  return (
    <Stack spacing={3}>
      <SectionCard sx={businessCardSx}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={2}>
          <Avatar
            variant="rounded"
            sx={{ width: 72, height: 72, bgcolor: 'primary.soft', color: 'primary.dark' }}
          >
            {initials(customerName(customer))}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h2" sx={{ overflowWrap: 'anywhere' }}>
              {customerName(customer)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
              {typeLabel(customer.type)} · {customerDocument(customer)}
            </Typography>
            <CustomerStatus status={customer.status} />
          </Box>
          <Button
            component={Link}
            to={`/customers/${customer.id}/edit`}
            variant="contained"
            startIcon={<EditIcon />}
          >
            Editar cliente
          </Button>
          <Button variant="outlined" onClick={() => setStatusOpen(true)}>
            {customer.status === 'ACTIVE' ? 'Inativar cliente' : 'Ativar cliente'}
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
          <SectionCard title="Dados principais" icon={PersonOutlineIcon} sx={businessCardSx}>
            <CustomerInfo
              items={
                customer.type === 'PERSON'
                  ? [
                      ['Nome completo', customer.name],
                      ['CPF', customerDocument(customer)],
                      [
                        'Data de nascimento',
                        customer.birthDate ? formatDate(`${customer.birthDate}T12:00:00`) : ''
                      ]
                    ]
                  : [
                      ['Razão social', customer.legalName],
                      ['Nome fantasia', customer.tradeName],
                      ['CNPJ', customerDocument(customer)],
                      ['Inscrição estadual', customer.stateRegistration],
                      ['Inscrição municipal', customer.municipalRegistration]
                    ]
              }
            />
          </SectionCard>
          <SectionCard title="Contato" icon={ContactMailOutlinedIcon} sx={businessCardSx}>
            <CustomerInfo
              items={[
                ...(customer.type === 'COMPANY' ? [['Nome do contato', customer.contactName]] : []),
                ['E-mail', customer.email],
                ['Telefone', formatPhone(customer.phone)],
                ['Celular', formatPhone(customer.mobile)]
              ]}
            />
          </SectionCard>
          <SectionCard title="Observações" sx={businessCardSx}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {customer.notes || 'Nenhuma observação informada.'}
            </Typography>
          </SectionCard>
        </Stack>
        <Stack spacing={3}>
          <SectionCard title="Endereço" icon={LocationOnOutlinedIcon} sx={businessCardSx}>
            <CustomerInfo
              items={[
                ['CEP', formatCep(a.cep)],
                ['Logradouro', a.street],
                ['Número', a.number],
                ['Complemento', a.complement],
                ['Bairro', a.neighborhood],
                ['Cidade / UF', [a.city, a.state].filter(Boolean).join(' / ')]
              ]}
            />
          </SectionCard>
          <SectionCard title="Registro de demonstração" icon={HistoryIcon} sx={businessCardSx}>
            <CustomerInfo
              items={[
                ['Data de cadastro', formatDate(customer.createdAt)],
                ['Última atualização', formatDate(customer.updatedAt)]
              ]}
            />
          </SectionCard>
        </Stack>
      </Box>
      {statusOpen && <CustomerStatusAction customer={customer} onClose={() => setStatusOpen(false)} />}
    </Stack>
  );
}
CustomerProfile.propTypes = { customer: PropTypes.object.isRequired };
