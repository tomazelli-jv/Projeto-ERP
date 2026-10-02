import { createMockSuppliersRepository } from './mockSuppliersRepository.js';
import { hydrateSupplier, supplierErrors, validateSupplier } from './supplier-model.js';
// A API futura substitui apenas a seleção da fonte; labels e campos pertencem à apresentação.
export const supplierModule = {
  key: 'suppliers',
  path: '/suppliers',
  singular: 'fornecedor',
  plural: 'fornecedores',
  Singular: 'Fornecedor',
  Plural: 'Fornecedores',
  commercial: true,
  empty: hydrateSupplier,
  errors: supplierErrors,
  steps: ['Dados Gerais', 'Endereço e Comercial', 'Fiscal', 'Financeiro'],
  validate: validateSupplier,
  repository: createMockSuppliersRepository
};
