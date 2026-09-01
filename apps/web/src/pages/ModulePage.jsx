import { Chip } from '@mui/material';
import PropTypes from 'prop-types';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';

export function ModulePage({ title, description, icon }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={<Chip label="Módulo em preparação" variant="outlined" />}
      />
      <SectionCard
        title={`Visão geral de ${title.toLowerCase()}`}
        subtitle="A estrutura visual está pronta para receber os dados reais deste módulo."
      >
        <EmptyState
          icon={icon}
          title="Nenhum conteúdo disponível nesta etapa"
          description="Este módulo será conectado à API após a aprovação do modelo operacional. Nenhum dado demonstrativo é exibido."
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
