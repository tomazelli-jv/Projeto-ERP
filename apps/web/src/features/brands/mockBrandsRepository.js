import { createMockLookupRepository, normalizeLookupName } from '../catalog-lookups/mockLookupRepository.js';
import { normalizeCnpj, validateCnpj } from '../../components/business/business-formatters.js';

/** @typedef {{id:string,code:string,name:string,cnpj:string,contact:string,active:boolean,createdAt:string,updatedAt:string}} Brand */
export { normalizeLookupName as normalizeBrandName } from '../catalog-lookups/mockLookupRepository.js';
// Validação compartilhada: documentos opcionais usam exclusivamente o helper oficial.
export function prepareBrand(input) {
  const name = String(input.name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const contact = String(input.contact ?? '').trim();
  const cnpj = normalizeCnpj(input.cnpj ?? '');
  if (!name) throw Error('Informe o nome da marca.');
  if (name.length > 150 || contact.length > 200) throw Error('Nome ou contato excede o tamanho permitido.');
  if (String(input.cnpj ?? '').trim() && !validateCnpj(input.cnpj)) throw Error('CNPJ inválido.');
  if (input.active !== undefined && typeof input.active !== 'boolean') throw Error('Status inválido.');
  return { name, cnpj, contact, active: input.active ?? true };
}

// Adapter mantem o contrato e a chave de Marcas existentes.
export function createMockBrandsRepository(options = {}) {
  return createMockLookupRepository({
    ...options,
    key: options.key ?? 'erp.dev.brands.v1',
    prepareRecord: prepareBrand,
    fields: ['name', 'cnpj', 'contact'],
    normalizeSearch: (value, field) => (field === 'cnpj' ? normalizeCnpj(value) : normalizeLookupName(value)),
    messages: {
      read: 'Não foi possível ler as marcas locais. Os dados foram preservados.',
      write: 'Não foi possível salvar as marcas no armazenamento local.',
      duplicate: 'Já existe uma marca com este nome.',
      missing: 'Marca não encontrada.'
    }
  });
}
