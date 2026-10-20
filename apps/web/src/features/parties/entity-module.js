import { createContext, useContext } from 'react';
import { createMockCustomersRepository } from '../customers/mockCustomersRepository.js';
import { hydrateCustomer, customerErrors, validateCustomerRecord } from '../customers/customer-schema.js';

// Configuração sem estado: as telas compartilhadas recebem vocabulário, modelo e fonte do módulo.
export const customerModule = {
  key: 'customers',
  path: '/customers',
  singular: 'cliente',
  plural: 'clientes',
  Singular: 'Cliente',
  Plural: 'Clientes',
  commercial: false,
  empty: hydrateCustomer,
  errors: customerErrors,
  steps: ['Dados Gerais', 'Fiscal', 'Financeiro'],
  validate: validateCustomerRecord,
  repository: createMockCustomersRepository
};
export const EntityModuleContext = createContext(customerModule);
export const useEntityModule = () => useContext(EntityModuleContext);
