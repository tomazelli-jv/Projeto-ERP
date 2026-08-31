import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import PropTypes from 'prop-types';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SectionCard } from '../components/common/SectionCard.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';

export function ModulePage({ title, description, emptyText }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button disabled startIcon={<AddIcon />} variant="contained">
            Novo cadastro
          </Button>
        }
      />
      <SectionCard
        title={`Visão geral de ${title.toLowerCase()}`}
        subtitle="Este módulo será conectado à API em uma etapa futura."
      >
        <EmptyState
          title={emptyText}
          description="Não há dados disponíveis. Nenhuma informação demonstrativa é persistida nesta interface."
        />
      </SectionCard>
    </>
  );
}

ModulePage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired
};
