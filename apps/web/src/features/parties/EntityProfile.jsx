import { useEntityModule } from './entity-module.js';
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
import { customerName, customerDocument, initials, typeLabel } from '../customers/customer-model.js';
import { EntityInfo, EntityStatus } from './EntityShared.jsx';
import { EntityStatusAction } from './EntityStatusAction.jsx';

// Perfil segue os cards de Usuários; mostra apenas os dados do repository de demonstração.
export function EntityProfile({ customer }) {
  const module = useEntityModule();
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
            <EntityStatus status={customer.status} />
          </Box>
          <Button
            component={Link}
            to={`${module.path}/${customer.id}/edit`}
            variant="contained"
            startIcon={<EditIcon />}
          >{`Editar ${module.singular}`}</Button>
          <Button variant="outlined" onClick={() => setStatusOpen(true)}>
            {customer.status === 'ACTIVE' ? `Inativar ${module.singular}` : `Ativar ${module.singular}`}
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
            <EntityInfo
              items={
                customer.type === 'PERSON'
                  ? [
                      ['Nome completo', customer.name],
                      ['CPF', customerDocument(customer)],
                      ...(!module.commercial
                        ? [
                            [
                              'Data de nascimento',
                              customer.birthDate ? formatDate(`${customer.birthDate}T12:00:00`) : ''
                            ]
                          ]
                        : [])
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
            <EntityInfo
              items={[
                ...(customer.type === 'COMPANY' ? [['Nome do contato', customer.contactName]] : []),
                ['E-mail', customer.email],
                ['Telefone', formatPhone(customer.phone)],
                ['Celular', formatPhone(customer.mobile)]
              ]}
            />
          </SectionCard>
          {module.commercial && (
            <SectionCard title="Dados comerciais" icon={ContactMailOutlinedIcon} sx={businessCardSx}>
              <EntityInfo
                items={[
                  ['Nome do contato comercial', customer.commercialContact],
                  ...(customer.type === 'COMPANY'
                    ? [
                        ['E-mail comercial', customer.commercialEmail],
                        ['Telefone comercial', formatPhone(customer.commercialPhone)]
                      ]
                    : [['Observações comerciais', customer.commercialNotes]])
                ]}
              />
            </SectionCard>
          )}
          <SectionCard title="Observações" sx={businessCardSx}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {customer.notes || 'Nenhuma observação informada.'}
            </Typography>
          </SectionCard>
        </Stack>
        <Stack spacing={3}>
          <SectionCard title="Endereço" icon={LocationOnOutlinedIcon} sx={businessCardSx}>
            <EntityInfo
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
            <EntityInfo
              items={[
                ['Data de cadastro', formatDate(customer.createdAt)],
                ['Última atualização', formatDate(customer.updatedAt)]
              ]}
            />
          </SectionCard>
        </Stack>
      </Box>
      {statusOpen && <EntityStatusAction customer={customer} onClose={() => setStatusOpen(false)} />}
    </Stack>
  );
}
EntityProfile.propTypes = { customer: PropTypes.object.isRequired };
