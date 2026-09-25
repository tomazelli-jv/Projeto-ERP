import { createMockProductsRepository } from './mockProductsRepository.js';
// Mesmo contrato de queries/mutations dos cadastros; namespace próprio impede invalidar outros módulos.
export const productModule = {
  key: 'products',
  path: '/products',
  singular: 'item',
  plural: 'itens',
  Singular: 'Item',
  Plural: 'Produtos e Serviços',
  repository: createMockProductsRepository
};
