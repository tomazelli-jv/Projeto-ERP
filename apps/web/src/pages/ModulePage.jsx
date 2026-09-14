import { Chip } from '@mui/material';
import PropTypes from 'prop-types';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';

// Estado compartilhado evita erros HTTP enquanto cada módulo recebe seu contrato no backend oficial.
export function ModulePage({ title, description, icon }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={<Chip label="Integração em andamento" variant="outlined" />}
      />
      <SectionCard
        title={`Visão geral de ${title.toLowerCase()}`}
        subtitle="A estrutura visual está pronta para receber os contratos oficiais deste módulo."
      >
        <EmptyState
          icon={icon}
          title="Integração em andamento"
          description="Este módulo está sendo conectado ao novo backend. Nenhuma chamada à API antiga é realizada."
        />
      </SectionCard>
    </>
  );
}

ModulePage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired
};
