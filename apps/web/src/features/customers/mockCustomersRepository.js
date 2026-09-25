import { hydrateCustomer, normalizeCustomerRecord, validateCustomerRecord } from './customer-schema.js';
import { createMockPartyRepository } from '../parties/mockPartyRepository.js';
import { emptyCustomer } from './customer-model.js';

// Fixtures exclusivamente demonstrativas, sem pessoas reais. Datas/documentos são exemplos de teste.
export function customerFixtures() {
  return [
    {
      id: 'demo-pf-1',
      type: 'PERSON',
      name: 'Cliente Demonstração A',
      document: '52998224725',
      status: 'ACTIVE',
      city: 'São Paulo',
      state: 'SP'
    },
    {
      id: 'demo-pf-2',
      type: 'PERSON',
      name: 'Cliente Demonstração B',
      document: '11144477735',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    },
    {
      id: 'demo-pj-1',
      type: 'COMPANY',
      legalName: 'Empresa Demonstração Alfa',
      tradeName: 'Demonstração Alfa',
      document: '12ABC34501DE35',
      status: 'ACTIVE',
      city: 'Palmas',
      state: 'TO'
    },
    {
      id: 'demo-pj-2',
      type: 'COMPANY',
      legalName: 'Empresa Demonstração Beta',
      document: '11222333000181',
      status: 'INACTIVE',
      city: 'Curitiba',
      state: 'PR'
    }
  ].map(({ city, state, ...record }, index) => ({
    ...emptyCustomer(),
    ...record,
    email: `demo${index + 1}@example.invalid`,
    address: { ...emptyCustomer().address, city, state },
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
}
// Mantém a chave e o contrato existentes de Clientes durante a extração compartilhada.
export function createMockCustomersRepository(options = {}) {
  return createMockPartyRepository({
    key: 'erp.dev.customers.v1',
    seed: customerFixtures,
    validate: validateCustomerRecord,
    hydrate: hydrateCustomer,
    // Leitura tolera campos novos ausentes, preservando os cadastros anteriores.
    validateStored: (r) =>
      !['PERSON', 'COMPANY'].includes(r.type) ||
      !['ACTIVE', 'INACTIVE'].includes(r.status) ||
      typeof r.document !== 'string',
    normalize: normalizeCustomerRecord,
    singular: 'cliente',
    plural: 'clientes',
    ...options
  });
}
