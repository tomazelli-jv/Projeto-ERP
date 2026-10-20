import { createMockBrandsRepository, prepareBrand } from './mockBrandsRepository.js';
import { formatCnpj } from '../../components/business/business-formatters.js';

// Apenas diferenças do cadastro; consulta, confirmação e persistência usam o fluxo compartilhado.
export const brandModule = {
  key: 'brands',
  repository: createMockBrandsRepository,
  prepare: prepareBrand,
  empty: () => ({ name: '', cnpj: '', contact: '', active: true }),
  title: 'Consulta de marcas',
  createTitle: 'Nova marca',
  editTitle: 'Editar marca',
  subtitle: 'Consulte e gerencie as marcas utilizadas nos produtos.',
  formDescription: 'Informe os dados da marca.',
  createLabel: 'Cadastrar marca',
  unavailable: 'Marcas aguardam integração com o backend.',
  notice: 'Demonstração local — as marcas ficam neste navegador. Use apenas dados fictícios.',
  success: 'Marca salva com sucesso.',
  emptyMessage: 'Nenhuma marca encontrada.',
  loading: 'Carregando marcas...',
  tableLabel: 'Marcas',
  activeLabel: 'Ativa',
  inactiveLabel: 'Inativa',
  confirmTitle: 'Inativar marca?',
  confirmDescription: 'A marca permanecerá cadastrada, mas não deverá ficar disponível para novos produtos.',
  fields: [
    { key: 'name', label: 'Nome', required: true, maxLength: 150 },
    { key: 'cnpj', label: 'CNPJ', type: 'cnpj', format: formatCnpj },
    { key: 'contact', label: 'Contato', maxLength: 200 }
  ]
};
