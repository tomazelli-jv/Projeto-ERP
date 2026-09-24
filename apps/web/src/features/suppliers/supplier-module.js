import { createMockSuppliersRepository } from './mockSuppliersRepository.js';
import { emptySupplier, validateSupplier } from './supplier-model.js';
// A API futura substitui apenas a seleção da fonte; labels e campos pertencem à apresentação.
export const supplierModule = {
  key: 'suppliers',
  path: '/suppliers',
  singular: 'fornecedor',
  plural: 'fornecedores',
  Singular: 'Fornecedor',
  Plural: 'Fornecedores',
  commercial: true,
  empty: emptySupplier,
  validate: validateSupplier,
  repository: createMockSuppliersRepository
};
