import { createMockPartyRepository } from '../parties/mockPartyRepository.js';
import { emptySupplier, normalizeSupplier, validateSupplier } from './supplier-model.js';

// Registros exclusivamente demonstrativos, independentes de Clientes e sem identidades reais.
export const supplierFixtures = () =>
  [
    {
      id: 'demo-pf-1',
      type: 'PERSON',
      name: 'Fornecedor Demonstração A',
      document: '52998224725',
      status: 'ACTIVE',
      city: 'Palmas',
      state: 'TO'
    },
    {
      id: 'demo-pf-2',
      type: 'PERSON',
      name: 'Fornecedor Demonstração B',
      document: '11144477735',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    },
    {
      id: 'demo-pj-1',
      type: 'COMPANY',
      legalName: 'Fornecedor Demonstração Alfa',
      tradeName: 'Demonstração Alfa',
      document: '12ABC34501DE35',
      status: 'ACTIVE',
      city: 'São Paulo',
      state: 'SP'
    },
    {
      id: 'demo-pj-2',
      type: 'COMPANY',
      legalName: 'Fornecedor Demonstração Beta',
      document: '11222333000181',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    }
  ].map(({ city, state, ...record }, index) => ({
    ...emptySupplier(),
    ...record,
    email: `fornecedor${index + 1}@example.invalid`,
    address: { ...emptySupplier().address, city, state },
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
/** @returns {import('./supplier-types.js').SuppliersRepository} */
export function createMockSuppliersRepository(options = {}) {
  return createMockPartyRepository({
    key: 'erp.dev.suppliers.v1',
    seed: supplierFixtures,
    validate: validateSupplier,
    normalize: normalizeSupplier,
    singular: 'fornecedor',
    plural: 'fornecedores',
    ...options
  });
}
