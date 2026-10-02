import { onlyDigits } from '../../components/business/business-formatters.js';
import { createMockNcmRepository, prepareNcm } from './mockNcmRepository.js';
// A primeira coluna é o próprio NCM, sem código sequencial duplicado.
export const ncmModule = {
  key: 'ncm',
  repository: createMockNcmRepository,
  prepare: prepareNcm,
  showInternalCode: false,
  empty: () => ({ code: '', description: '', active: true }),
  title: 'Consulta de NCM',
  createTitle: 'Novo NCM',
  editTitle: 'Editar NCM',
  subtitle: 'Consulte e gerencie os códigos NCM utilizados nos produtos.',
  formDescription: 'Informe o código NCM e sua descrição.',
  createLabel: 'Cadastrar NCM',
  unavailable: 'NCM aguarda integração com o backend.',
  notice:
    'Demonstração local — esta base não é uma fonte fiscal oficial. Os registros ficam neste navegador.',
  success: 'NCM salvo com sucesso.',
  emptyMessage: 'Nenhum NCM encontrado.',
  loading: 'Carregando NCMs...',
  tableLabel: 'NCM',
  activeLabel: 'Ativo',
  inactiveLabel: 'Inativo',
  confirmTitle: 'Inativar NCM?',
  confirmDescription: 'O NCM permanecerá cadastrado, mas não deverá ficar disponível para novos produtos.',
  fields: [
    {
      key: 'code',
      label: 'Código NCM',
      columnLabel: 'NCM',
      required: true,
      maxLength: 8,
      inputMode: 'numeric',
      normalizeInput: (value) => onlyDigits(value, 8)
    },
    { key: 'description', label: 'Descrição', required: true, multiline: true, maxLength: 500 }
  ]
};
