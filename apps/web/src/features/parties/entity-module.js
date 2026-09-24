import { createContext, useContext } from 'react';
import { createMockCustomersRepository } from '../customers/mockCustomersRepository.js';
import { emptyCustomer, validateCustomer } from '../customers/customer-model.js';

// Configuração sem estado: as telas compartilhadas recebem vocabulário, modelo e fonte do módulo.
export const customerModule = {
  key: 'customers',
  path: '/customers',
  singular: 'cliente',
  plural: 'clientes',
  Singular: 'Cliente',
  Plural: 'Clientes',
  commercial: false,
  empty: emptyCustomer,
  validate: validateCustomer,
  repository: createMockCustomersRepository
};
export const EntityModuleContext = createContext(customerModule);
export const useEntityModule = () => useContext(EntityModuleContext);
