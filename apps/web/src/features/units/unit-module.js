import { createMockUnitsRepository, prepareUnit } from './mockUnitsRepository.js';

// Diferenças textuais e campos do mesmo cadastro auxiliar usado por Marcas e Grupos.
export const unitModule = {
  key: 'units',
  repository: createMockUnitsRepository,
  prepare: prepareUnit,
  empty: () => ({ abbreviation: '', description: '', active: true }),
  title: 'Consulta de unidades de medida',
  createTitle: 'Nova unidade de medida',
  editTitle: 'Editar unidade de medida',
  subtitle: 'Consulte e gerencie as unidades utilizadas nos produtos.',
  formDescription: 'Informe os dados da unidade de medida.',
  createLabel: 'Cadastrar unidade',
  unavailable: 'Unidades de medida aguardam integração com o backend.',
  notice:
    'Demonstração local — as unidades ficam neste navegador. Registros iniciais são dados de desenvolvimento.',
  success: 'Unidade salva com sucesso.',
  emptyMessage: 'Nenhuma unidade encontrada.',
  loading: 'Carregando unidades...',
  tableLabel: 'Unidades de medida',
  activeLabel: 'Ativa',
  inactiveLabel: 'Inativa',
  confirmTitle: 'Inativar unidade de medida?',
  confirmDescription:
    'A unidade permanecerá cadastrada, mas não deverá ficar disponível para novos produtos.',
  fields: [
    { key: 'abbreviation', label: 'Sigla', required: true, uppercase: true, maxLength: 10 },
    { key: 'description', label: 'Descrição', required: true, maxLength: 150 }
  ]
};
