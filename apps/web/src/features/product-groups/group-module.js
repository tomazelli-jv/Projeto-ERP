import { createMockGroupsRepository, prepareGroup } from './mockGroupsRepository.js';

// Configuração do mesmo diálogo utilizado por Marcas; não adiciona rota nem contrato HTTP.
export const groupModule = {
  key: 'product-groups',
  repository: createMockGroupsRepository,
  prepare: prepareGroup,
  empty: () => ({ name: '', description: '', active: true }),
  title: 'Consulta de grupos',
  createTitle: 'Novo grupo',
  editTitle: 'Editar grupo',
  subtitle: 'Consulte e gerencie os grupos utilizados na organização dos produtos.',
  formDescription: 'Informe os dados do grupo.',
  createLabel: 'Cadastrar grupo',
  unavailable: 'Grupos aguardam integração com o backend.',
  notice: 'Demonstração local — os grupos ficam neste navegador. Use apenas dados fictícios.',
  success: 'Grupo salvo com sucesso.',
  emptyMessage: 'Nenhum grupo encontrado.',
  loading: 'Carregando grupos...',
  tableLabel: 'Grupos',
  activeLabel: 'Ativo',
  inactiveLabel: 'Inativo',
  confirmTitle: 'Inativar grupo?',
  confirmDescription: 'O grupo permanecerá cadastrado, mas não deverá ficar disponível para novos produtos.',
  fields: [
    { key: 'name', label: 'Nome', required: true, maxLength: 150 },
    { key: 'description', label: 'Descrição', multiline: true, maxLength: 1000 }
  ]
};
