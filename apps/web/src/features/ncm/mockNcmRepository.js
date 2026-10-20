import { createMockLookupRepository, normalizeLookupName } from '../catalog-lookups/mockLookupRepository.js';
/** @typedef {{id:string,code:string,description:string,active:boolean,createdAt:string,updatedAt:string}} Ncm */
// Validação estrutural: não infere descrição nem classificação fiscal.
export function prepareNcm(input) {
  const code = String(input.code ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (!code) throw Error('Informe o código NCM.');
  if (!/^[0-9]{8}$/.test(code)) throw Error('O NCM deve possuir exatamente 8 dígitos.');
  if (!description) throw Error('Informe a descrição do NCM.');
  if (description.length > 500) throw Error('A descrição deve ter até 500 caracteres.');
  if (input.active !== undefined && typeof input.active !== 'boolean') throw Error('Status inválido.');
  return { code, description, active: input.active ?? true };
}
// Exemplos técnicos exclusivamente DEV. Não constituem fonte fiscal oficial.
export const ncmFixtures = () =>
  [
    ['33051000', 'Demonstração — xampus'],
    ['21069090', 'Demonstração — preparações alimentícias'],
    ['00000001', 'Demonstração técnica — código com zero inicial']
  ].map(([code, description]) => ({
    id: `dev-ncm-${code}`,
    code,
    description,
    active: true,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  }));
export function createMockNcmRepository(options = {}) {
  return createMockLookupRepository({
    seed: ncmFixtures,
    ...options,
    key: options.key ?? 'erp.dev.ncm.v1',
    identityKey: 'code',
    generateCode: false,
    prepareRecord: prepareNcm,
    fields: ['code', 'description'],
    normalizeSearch: normalizeLookupName,
    messages: {
      read: 'Não foi possível ler os NCMs locais. Os dados foram preservados.',
      write: 'Não foi possível salvar os NCMs no armazenamento local.',
      duplicate: 'Já existe um cadastro para este NCM.',
      missing: 'NCM não encontrado.'
    }
  });
}
// Reconfere o vínculo antes de salvar; inativação não apaga referências históricas.
export async function resolveProductNcm(repository, data, initial) {
  if (data.type !== 'PRODUCT' || (!data.ncm && !data.ncmId)) return data;
  const current = data.ncmId
    ? await repository.getById(data.ncmId)
    : (await repository.list({ field: 'code', search: data.ncm, match: 'equals' })).items[0];
  const preserved =
    initial && (initial.ncmId ? initial.ncmId === data.ncmId : !data.ncmId && initial.ncm === data.ncm);
  if ((!current || !current.active) && !preserved) throw Error('Selecione um NCM ativo para o novo vínculo.');
  return current ? { ...data, ncm: current.code, ncmId: current.id } : data;
}
