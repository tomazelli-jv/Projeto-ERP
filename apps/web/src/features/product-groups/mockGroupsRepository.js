import { createMockLookupRepository, normalizeLookupName } from '../catalog-lookups/mockLookupRepository.js';

/** @typedef {{id:string,code:string,name:string,description:string,active:boolean,createdAt:string,updatedAt:string}} ProductGroup */
// Grupo simples, sem hierarquia. Dados desconhecidos não entram na persistência.
export function prepareGroup(input) {
  const name = String(input.name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const description = String(input.description ?? '').trim();
  if (!name) throw Error('Informe o nome do grupo.');
  if (name.length > 150) throw Error('O nome deve ter até 150 caracteres.');
  if (description.length > 1000) throw Error('A descrição deve ter até 1000 caracteres.');
  if (input.active !== undefined && typeof input.active !== 'boolean') throw Error('Status inválido.');
  return { name, description, active: input.active ?? true };
}
export function createMockGroupsRepository(options = {}) {
  return createMockLookupRepository({
    ...options,
    key: options.key ?? 'erp.dev.product-groups.v1',
    prepareRecord: prepareGroup,
    fields: ['name', 'description'],
    normalizeSearch: normalizeLookupName,
    messages: {
      read: 'Não foi possível ler os grupos locais. Os dados foram preservados.',
      write: 'Não foi possível salvar os grupos no armazenamento local.',
      duplicate: 'Já existe um grupo com este nome.',
      missing: 'Grupo não encontrado.'
    }
  });
}
